import test from 'ava'
import { run, itself, callMethod } from '../'

test('should return synchronous effects synchronously', t => {
  t.is(run([itself(4)]), 4)

  t.is(
    run([
      callMethod(Math, 'min', [3, 4]),
      y => [callMethod(Math, 'max', [y, 2])]
    ]),
    3
  )
})

test('should return async effects asynchronously', async t => {
  t.is(await run([callMethod(Promise, 'resolve', [1])]), 1)
})
