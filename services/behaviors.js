'use strict';
var _ = require('lodash'),
  rivets = require('rivets'),
  references = require('./references'),
  label = require('./label'),
  // hash of all behaviors
  behaviorsHash = {},
  // has of current bindings
  bindingsHash = {};

/**
 * add a behavior to the hash. called by users who want to create custom behaviors
 * @param {string}   name
 * @param {Function} fn   usually from a browserify require() call
 */
function add(name, fn) {
  // note: this WILL overwrite behaviors already in the hash,
  // allowing people to use custom versions of our core behaviors
  behaviorsHash[name] = fn;
}

function omitMissingBehaviors(behavior) {
  var name = behavior[references.behaviorKey],
    found = !!behaviorsHash[name];

  if (!found) {
    console.warn('Behavior "' + name + '" not found. Make sure you add it!');
  }

  return found;
}

/**
 * expand a single behavior
 * @param  {*} behavior
 * @return {{}}
 */
function expandBehavior(behavior) {
  if (_.isString(behavior) && behavior.length) {
    // _has: text
    return { fn: behavior, args: {} };
  } else if (_.isPlainObject(behavior) && _.isString(behavior[references.behaviorKey])) {
    /* _has:
     *   fn: text
     *   required: true
     */
    return { fn: behavior[references.behaviorKey], args: _.omit(behavior, references.behaviorKey) };
  } else {
    throw new Error('Cannot parse behavior: ' + behavior);
  }
}

/**
 * _has: 'text' or _has: { thing: thing } is shorthand
 * @param behaviors
 * @returns {Boolean|*}
 */
function isShortHandDefinition(behaviors) {
  return _.isString(behaviors) || _.isPlainObject(behaviors);
}

/**
 * get an array of expanded behaviors
 * @param  {*} behaviors
 * @return {[]}           array of {fn: string, args: {}}
 */
function getExpandedBehaviors(behaviors) {
  if (isShortHandDefinition(behaviors)) {
    return [expandBehavior(behaviors)];
  }

  return behaviors.map(expandBehavior);
}

/**
 * run behaviors for a field, in order
 * @param  {{data: {_schema: {_has: [object]}}, path: string}} context
 * @return {Element}
 */
function run(context) {
  var result,
    contextLabel = label(context.path, context.data._schema),
    behaviors = getExpandedBehaviors(context.data._schema[references.fieldProperty]);

  //apply behaviours to create new context containing form element
  result = _(behaviors)
    .filter(omitMissingBehaviors)
    .reduce(function (currentContext, behavior) {
      //apply behaviours
      var name = behavior[references.behaviorKey];
      return behaviorsHash[name](currentContext, behavior.args);
    }, {
      el: document.createDocumentFragment(),
      bindings: _.assign({ label: contextLabel, name: context.path }, context),
      rivets: rivets,
      path: context.path
    });

  // use the rivets instance that was passed through the behaviors, since it may have formatters/etc added to it
  bindingsHash[context.path] = result.rivets.bind(result.el, result.bindings); // compile and bind templates, persist them to bindingsHash
  return result.el;
}

function getBinding(name) {
  return bindingsHash[name];
}

exports.add = add;
exports.run = run;
exports.getExpandedBehaviors = getExpandedBehaviors;
exports.getBinding = getBinding;
