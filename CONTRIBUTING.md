# Contributing to IntraCom

## Development Setup

```bash
# Clone and install
git clone https://github.com/btr-supply/agentic-intracom.git
cd agentic-intracom
bun install

# Run in development mode
bun run dev
```

---

## Branch Naming

Format: `<category>/<brief-description>`

**Rules**:
- Lowercase only
- Separate words with hyphens
- Keep brief (2-4 words)

**Examples**:
- `feat/add-agent-discovery`
- `fix/allowlist-enforcement`
- `docs/update-examples`
- `refac/state-management`

---

## Commit Messages

Format:
```
[category] Brief description in imperative mood

Optional detailed explanation.
```

**Rules**:
1. Prefix: `[category]` in lowercase with brackets
2. Imperative mood: "Add" not "Added"
3. First line <= 72 characters
4. Optional body after blank line
5. NEVER mention AI tools in commit messages

**Categories**:
- `[feat]` - New features, tools, functionality
- `[fix]` - Bug fixes, error corrections
- `[docs]` - Documentation updates only
- `[refac]` - Restructuring, same behavior
- `[ops]` - CI/CD, build, tooling

**Examples**:
```
[feat] Add agent discovery tool
[fix] Resolve allowlist enforcement bug
[docs] Update OpenCode integration examples
[refac] Simplify state management
```

---

## Code Formatting

We use **Bun** as the runtime and package manager. Follow these guidelines:

### TypeScript/JavaScript

- Use **Bun** conventions (see [Bun Docs](https://bun.sh/docs))
- Use **Prettier** for formatting: `bunx prettier --write .`
- 2 space indentation
- Single quotes for strings
- Semicolons required
- Trailing commas where valid

### Code Style

- Use `Bun.file()` for file operations (not `fs.readFile`)
- Use `Bun.write()` for file writes
- Use `crypto.randomUUID()` for IDs (built-in)
- Use `Bun.crypto.subtle.hashSync()` for hashing
- Use `JSON.stringify()` with 2-space indentation

---

## Pull Requests

1. Fork the repository
2. Create a feature branch with proper naming
3. Make your changes
4. Run formatter: `bunx prettier --write .`
5. Submit a pull request with title in commit format

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
