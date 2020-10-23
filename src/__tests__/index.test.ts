import { greet } from '../index'

test('greet', () => {
    expect(greet("Dave")).toBe("Hello Dave")
})
