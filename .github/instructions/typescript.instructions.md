---
description: 'TypeScript strict mode, type-only imports, naming conventions, and shared types from packages/shared for all TypeScript files'
applyTo: '**/*.ts, **/*.tsx'
---

# TypeScript Conventions

## Strict Mode

- `strict: true` in all `tsconfig.json` files — no exceptions
- Never use `any` — use `unknown` and narrow with type guards
- Enable `noUncheckedIndexedAccess` for safe index access

## Imports

- Use type-only imports for types: `import type { Hackathon } from '...'`
- Import shared types from `@hackops/shared/types/api-contract`
- Never duplicate type definitions that exist in `packages/shared/types/`
- Use path aliases: `@/` for `apps/web/src/`, `@hackops/shared` for shared package

## Naming Conventions

| Element         | Convention        | Example                      |
| --------------- | ----------------- | ---------------------------- |
| Files           | kebab-case        | `hackathon-service.ts`       |
| Types/Interfaces| PascalCase        | `HackathonResponse`          |
| Functions       | camelCase         | `getLeaderboard`             |
| Constants       | SCREAMING_SNAKE   | `MAX_TEAM_SIZE`              |
| Enums           | PascalCase        | `HackathonState`             |
| Boolean vars    | is/has/can prefix | `isAdmin`, `hasPermission`   |

## Type Patterns

- Prefer `interface` for object shapes that may be extended
- Prefer `type` for unions, intersections, and mapped types
- Export types alongside their implementation
- Use generic constraints: `<T extends BaseEntity>` not `<T>`

## Error Handling

- Throw typed errors: extend `Error` with a `code` property
- Use `unknown` for catch clause variables: `catch (error: unknown)`
- Narrow errors before accessing properties

## Null Safety

- Prefer `undefined` over `null` for optional values
- Use optional chaining: `user?.role` not `user && user.role`
- Use nullish coalescing: `value ?? defaultValue` not `value || defaultValue`
