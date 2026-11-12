# Same flow, three ways

The sales review has one AI step, so most of the flow is the same in all three versions.
Only the AI step changes.

| Part of the flow | Non-AI version | AI version (current) | Eve version (planned, not built yet) |
| --- | --- | --- | --- |
| Choice and question steps (start, Next buttons, retry) | Same | Same | Chat messages with buttons, or tool calls with prompts |
| API steps (fetch orders, KPIs, products, findings, recommendations, monthly) | Same, run by the engine | Same | One Eve tool per action |
| Rule step (validation check) | Same | Same | Instruction or tool logic |
| AI step (trend narrative) | Replaced by fixed text, or skipped | Same, calls the AI model | Model writes it from the tool result |
| Approval step | Same, a person must approve | Same | Tool approval check: allow, deny, or ask the user (per tool call) |
| Final message and restart | Same | Same | Chat reply |
| Channels (web, Telegram, Slack) | Same connectors | Same connectors | Eve channel (Slack needs our own token) |
| Where it runs | Our Coolify app | Our Coolify app | Eve, self-hosted on Coolify |

Non-AI test (AI narrative step skipped, `s07m_monthly` next set to `s08`):
- Monthly tables and charts show as expected.
- No "Order trend narrative" card.
- Approval message shows correctly.
- Result: working end to end in web chat.
- Change reverted in conversation.json after the test.

AI test (flow as in conversation.json, with the AI narrative step):
- Monthly tables and charts show as expected.
- "Order trend narrative" card appears (written by the AI).
- Approval message shows correctly.
- Result: working end to end in web chat.

Eve test (sales-analyst-eve, OpenRouter Qwen model, daily_kpis tool):
- Tool fetched the same data as the app: 3 orders, MYR 439.00, avg 146.33 for 2026-06-29.
- AI wrote the summary. It added statements not in the data (for example, a recommendation for Merchandising), so AI summaries need checking.
- Result: data path works; output is less controlled than the app's fixed card.
- Findings check: the Eve findings tool matches the app's findings card for 2026-06-29.
- Recommendations check: the Eve recommendations tool matches the app's recommended actions card for 2026-06-29.
 Approval check: Eve asks for approval before the publish tool runs, and the tool only runs after "y".
- Caution: the AI's reply said the report was "saved." The tool did not save anything, so AI replies need checking against the tool output.
- Full review check: Eve ran the whole review for 2026-06-29 in the instructed order and matched the app's numbers. It took about 1 minute. The AI calculated the percentage changes itself, so those need checking.