# Why the rules hold, and where real code deviates

Read this when a rule in `SKILL.md` needs its reason, or when a case sits
between two rules. Every section names the rule group it extends. Nothing
here restates a rule; it adds the why, the edge cases and the measured
deviations.

The rules come from three sources: a style wiki extracted from one
codebase over months, a second codebase in the same style written months
earlier, and TigerStyle. Where TigerStyle and the user's style disagree,
the user's style wins and the disagreement is noted.

## Contracts

**Why an assert and not a test.** An assert protects every caller,
including callers not written yet. A test protects only the paths it
exercises today. An assert says "this state must never exist"; a test
says "the result was right on this input".

**Why one assert per invariant.** The message of a compound assert lies
about which clause failed. Worse: with three `should_panic` tests that
match the same message, all three pass even when the code checks only one
of the three invariants. Splitting the assert is what makes the tests
bite.

**Why five and not "as many as needed".** Past five, the function does
too much. The fix is extraction, so the two limits (five invariants, forty
lines) never fight: adding the fifth invariant must never push you to
delete another one to stay within the line count. That is why contract
lines are not counted.

**Checked once, and the pair exception.** Three cases where the usual
assert is skipped:

- A constructor made of literal assignments has no postcondition. An
  assert would repeat the lines above it.
- A precondition already asserted by a callee is not repeated. The
  callee's message is the contract, and the should-panic test matches
  that message.
- Reading an optional that a precondition says is present uses one
  `expect`-style unwrap with the contract message. No assert before it,
  no bare unwrap after it.

A postcondition may reuse a private helper the body also uses. Then it
checks that the write landed, not the rule. The rule gets its own test
where it lives.

A precondition that only forbids wasted work is not a contract. Calling a
refresh on something already clean is useless and correct. An assert
there turns a cost into a panic and forces every test to stage activity
first. Policy belongs to the caller.

TigerStyle's pair assertion is a different thing and does not contradict
the rule above. It applies to data that crosses a boundary: written to
disk and read back, sent over a wire and received. Each side of the
boundary is a different program state, so each side checks. Inside one
call chain there is one state, so there is one check.

**Contracts as documentation.** From TigerStyle one thing survives on
comments: where the condition is critical and surprising, a plainly true
assert is stronger documentation than a comment, because it cannot go
stale without failing.

**The checked profile.** A standard release build turns debug assertions
off, so every contract is inert during real play and QA and fires only
under the test runner. Optimization level and assertions are independent
knobs. The checked profile keeps both on: fast, and contracts enforced.
The plain release build stays for shipping.

**Measured deviations** (the report script on the source codebase):

- 31 functions still carry a compound assert (`a && b`). They predate the
  rule.
- 15 functions hold an iterator or closure inside an assert instead of
  calling a helper.
- The source codebase asserts with `debug_assert!` and keeps one plain
  `assert!` where a config is compiled into a runtime rule, because a bad
  config must fail in the shipping build too. That is the one place a
  contract outlives the checked profile.

## Function shape

**Why forty and not seventy.** Measured on the source codebase, 1033
functions: no function over 70 lines, four over 50, twenty-one over 40
(counting every non-blank line, signature and contracts included). A
limit of 70 would never fire and would be decoration. With the rule as
stated (logic only, contracts excluded) the same code measures median 2,
mean 4.4, two functions over 40. The limit is meant to be loose. Hitting
it means the function is doing two things.

**Push ifs up and fors down.** When splitting, keep every branch in the
parent and move the branch-free fragments into helpers. The parent holds
the state in locals and asks helpers to compute what should change, not
to apply the change. Leaf functions stay pure.

**Pure functions behind the edge.** When a business rule can only be
exercised through a database, the network or the filesystem, its tests
become integration tests: slow, flaky, and blind to which rule failed.
Moving the rule into a pure function called from the entry point gives
it unit tests in isolation; the integration test then covers only the
wiring.

**Bounds and recursion** come from TigerStyle unchanged. A loop with no
bound is an infinite loop waiting for the right input. Recursion is a
loop whose bound is the stack.

**Measured deviations:** two functions over 40 logic lines, both flat
dispatch tables (a game tick, a key-name lookup). The older codebase has
one 124-line `Display` match over opcodes, already listed as debt there,
and three recursive tree walks written before the no-recursion rule.

## Structs

**Why private fields, no exception.** With a public field no single place
holds the rule for what makes it valid. Every call site re-derives the
invariant and the copies drift. This is the principle in its purest form:
the thing that owns the state is the only thing that touches it.

**Why consuming builders.** A builder that takes ownership and returns a
new value cannot leave a half-built struct behind. The call site reads as
one expression. A `with_x` that mutates in place is a setter with a
misleading name.

**Why no inheritance.** A subclass reads and writes the parent's state
without going through the parent's interface. That is privileged access
to someone else's state, which the principle forbids. Composition keeps
the boundary: the outer struct holds the inner one and calls its methods.

**The wrapper hides behind an alias.** When a value travels shared or
boxed, the alias names the shared form and the constructor returns it.
The call site never spells the wrapper: `Value::int(3)` returns the
shared alias, never `Rc::new(Value::Int(3))`.

**A threshold is a state the type failed to model.** When a comparison
against a small constant decides what a value is (empty, present, stale),
that constant is a state boundary living outside the type. In order of
preference:

1. Change the representation so the question disappears. An integer is
   empty or it is not.
2. If a threshold is truly needed, one private constant on the type that
   owns the state. Everyone else calls a method.
3. Thresholds that answer different questions stay different constants,
   even when the numbers match.

The case behind the rule: "is this trail empty" was written by hand in
nine places across three files, each with its own epsilon. Two of them
also decided a color. One drift, and the thing was invisible on screen
and still steering. Moving the value to integers deleted both defects at
once.

**Extract the skeleton.** When the same function shape repeats (compile
one builtin, handle one opcode, draw one widget), the shape becomes a
shared signature alias, a table or declarative macro that registers name
and handler, and the shared checks (arity, bounds) run once before
dispatch. Downstream code trusts the check and asserts it. When every
handler takes the same bundle of mutable references, the bundle becomes
a context object with methods that delegate to the inner objects.

**One object, two phases.** When a mutable object is about to serve two
distinct phases of a pipeline (compile and run, build and draw), it has
two owners, which the principle forbids. Split the responsibilities into
two structs. If the double role is accepted on purpose, write down that
the two phases will never be separable: no caching, no parallelism, no
deferred execution across them.

**Explicit-width integers.** A bare architecture-dependent size type
says nothing about the range a value can take. The explicit width is
part of the contract.

**A constructor samples nothing from the world.** No clock, no device, no
screen, no network at construction. A constructor that does panics
headless, so tests cannot build the object and benches cannot run.

**Measured deviations:**

- One struct in the source codebase keeps private in-place mutators for a
  per-frame loop that flips a flag on every element. Rebuilding a vector
  through builders to flip a bool was judged not worth it. The mutators
  are private, so the exception cannot leak into construction code.
- Code with public fields written before the rule is swept when touched,
  not grandfathered.
- The source codebase has 137 non-test uses of the architecture-dependent
  size type. Rust forces it at every index, so the sweep stops at the
  index sinks.

## Errors

**The line that decides everything.** A contract catches a programmer
error: the program is in a state the author said cannot exist, and the
only honest answer is to stop. A world error is expected: a file is
missing, a user typed a letter where a number goes, a peer went away. It
is a value the normal flow returns and the caller handles. Neither shape
is used for the other.

If every call site unwraps a result or always propagates it, that result
was a contract in disguise: replace it with an assert.

**The shape of a world error.** One error type per phase or module,
unified in a root error that wraps them transparently. An error that
reaches the user carries where it happened in the source and a hint on
what to do. It is born minimal where it happens and gains context at the
edge of the system, not in the depths: the inner function does not know
who is asking.

Domain failures inside a system (a division by zero in a scripted
language, a type mismatch in user input) are values that the normal flow
propagates, not exceptions. The interrupting error is reserved for a
broken invariant.

**Measured deviation:** the older codebase returned an error carrying
`file:line` for "impossible" states instead of panicking, through a
macro, so that no execution path could panic. The later rule is the
panic. The reason moved: an impossible state is a bug, and a bug that
returns is a bug that gets handled by accident.

## Tests

**Why a test has no assert of its own.** The assisted loop erodes tests
written after the body: change the code, read the code, adapt the test
to pass. Body and test end up wrong together, in agreement. A contract
written first is an independent statement of intent, and the test only
exercises it.

**By layer.** Structural invariants are asserts, never tests. Math rules
(a bell peak, a normalized kernel) keep a few behavioural tests written
from the contract before the body. Integration runs on real state stay,
as the net against silent numeric drift. UI glue gets no tests, or one
smoke test. A test that breaks on a refactor that did not change
behaviour is raised to the contract level or deleted, not repaired.

**Why the message must be stable.** The invalid-input test matches the
precondition's message by substring. Rewording the message breaks the
test with the contract unchanged. Keep the message short and next to the
identifier, and change it only when the invariant changes.

**Measured deviation:** most tests in the source codebase written before
the rule still hold their own asserts (about 270 test functions across
every module). The wiki lists only one module as the known deviation;
the report script shows the sweep has barely started. New tests follow
the rule; old ones are swept when their function is touched.

## Comments

**Why zero.** A comment in the body describes the how and rots on every
refactor without anyone noticing. Nothing breaks when it lies. The
trade-off is accepted: doc tooling and editor hover render only doc
comments, so a plain `//` line is visible only through go-to-definition.

TigerStyle says comments should always say why. This style agrees on the
goal and disagrees on the place: the why goes in the project wiki, linked
from the decision, not inline. Both fight stale comments. The local risk
is code-to-wiki links rotting.

**Measured deviations:** the older codebase carried a one-line doc
comment on nearly every public function, section separators inside long
impl blocks, and future code parked as commented-out TODOs. The later
rule removed all three. One four-line comment survives in one rules file
of the source codebase; its reason has since moved to the wiki.

## Abstraction

**Where TigerStyle loses.** TigerStyle asks for "only a minimum of
excellent abstractions". This style says nearly everything is a struct
with its interface. The two agree on the clause that survives: an
abstraction must make sense of the domain, not of the code. They differ
on what "abstraction" means. Here it means encapsulated, a boundary
around state, not generalized for a future that has not arrived.

**A helper lives where its knowledge lives.** "Is this cell in bounds" is
a fact of the grid and belongs on the grid. "Which offsets are valid
moves" knows the movement model of one game and stays in that game.
Putting the whole filter on the grid would read as reuse and would
couple the core to one game. The counterpart: when a consumer keeps
re-deriving the same computation, that is a missing primitive in the
library, not a discipline problem in the consumer.

**When a trait pays.** One consumer, many implementors, the consumer
defines the contract. An engine defines the trait and the games implement
it; every tick goes through it at zero cost. A trait over a backend has
one implementor at any time, so nothing is polymorphic, and it inverts
the semantics: the backend below decides what the layer above can
express. What makes a backend swap cheap is confinement, not indirection:
domain types never carry backend concepts, so backend types die at the
edges.

**DRY at the second copy.** The case that shows the cost: one constant
defined in two places, `0.1` in tests and `0.15` in production. Both
compiled, both passed, and the tests verified a different physics than
what ran.
