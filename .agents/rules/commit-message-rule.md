---
trigger: always_on
---

After every successfully completed task:

1. Create a concise Conventional Commit message.
2. Commit all changes automatically.
3. Push the current branch automatically.
4. If the task fails or the code has errors, do not commit or push.
5. If there are no file changes, do nothing.
6. Use one commit per completed task.