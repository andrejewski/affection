function call (func, args, context) {
  return { type: 'call', func, args, context }
}

function callMethod (obj, method, args) {
  return { type: 'callMethod', obj, method, args }
}

function all (effects) {
  return { type: 'all', effects }
}

function race (effects) {
  return { type: 'race', effects }
}

function itself (value) {
  return { type: 'itself', value }
}

function defaultHandle (effect, handle) {
  switch (effect.type) {
    case 'call':
      return effect.func.apply(effect.context, effect.args)
    case 'callMethod':
      return effect.obj[effect.method].apply(effect.obj, effect.args)
    case 'all':
      return Promise.all(effect.effects.map(handle))
    case 'race':
      return Promise.race(effect.effects.map(handle))
    case 'itself':
      return effect.value
  }
}

function andThen (value, callback) {
  return value && typeof value.then === 'function'
    ? value.then(callback)
    : callback(value)
}

function run (plan, handle = defaultHandle) {
  return andThen(handle(plan[0], handle), function (nextValue) {
    return plan[1] ? run(plan[1](nextValue), handle) : nextValue
  })
}

function step (makeEffect) {
  return function (next) {
    return function (input) {
      return [makeEffect(input), next]
    }
  }
}

function mapStep (step, transform) {
  return function (next) {
    return function (input) {
      return step(function (output) {
        return next(transform(output, input))
      })(input)
    }
  }
}

function batchSteps (steps) {
  return function (next) {
    return steps.concat(next).reduceRight(function (lastStep, previousStep) {
      return previousStep(lastStep)
    })
  }
}

function runStep (step, input, handle) {
  return run(step()(input), handle)
}

exports.call = call
exports.callMethod = callMethod
exports.all = all
exports.race = race
exports.itself = itself
exports.defaultHandle = defaultHandle
exports.run = run

exports.step = step
exports.mapStep = mapStep
exports.batchSteps = batchSteps
exports.runStep = runStep
