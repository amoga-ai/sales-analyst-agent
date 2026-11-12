# Flow format

A flow is a JSON file with a start node and a map of nodes. Each node has a `type`
and the fields that type needs. The engine runs one node at a time.

## Top level

- `name`: the flow's name
- `start`: the id of the first node
- `nodes`: a map from node id to node

## Node types

- `choice`: shows a message and buttons. Fields: `message`, `options`, and optionally `variable`
  (the name to store the answer under; defaults to the node id).
  Each option has `label`, `value`, `actionId`, `next`, and optionally `loading`.
- `question`: asks for typed text. Fields: `message`, `input` (`variable`, `minLength`, `maxLength`), `next`.
- `api`: runs a server action by name. Fields: `action`, `next`.
- `ai`: writes text with the AI model from data. Fields: `prompt`, `source`, `output`, `next`.
- `rule`: branches on a stored value. Fields: `field`, `op`, `value`, `then`, `else`.
  Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`.
- `approval`: shows a message and approve or reject buttons. A person must choose.
- `message`: shows a final message, then restarts the flow from the start node.

## Rules

- Every `next`, `then`, and `else` must point to a node id in the same file.
- `approval` options must lead to a node. Nothing is published without an approval step.
- Keep the `actionId` values unique within a flow.

## Placeholders

- Write `{{name}}` in any `message` to insert a stored value, such as `{{validation_ok}}`.
- If no value is stored under that name, it is replaced with an empty string.

## Where the code lives

- The `action` names for `api` steps and the `source` names for `ai` steps are defined in code,
  not in the flow file. A flow can only use names that already exist.
- Today the flow is loaded when the app is built. Changing a flow needs a redeploy.

## Allowed actions (api steps)

verify_connection, fetch_orders, validate_orders, retry_validation, daily_kpis,
status_exceptions, top_products, findings, recommendations, publish_report,
monthly_orders, answer_failed_orders, answer_best_products, answer_compare

## Allowed data sources (ai steps)

- top_orders