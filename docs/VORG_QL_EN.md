# VOrg-QL Query Guide

VOrg-QL is a query language inspired by Emacs [org-ql](https://github.com/alphapapa/org-ql). It uses S-expression (sexp) syntax to filter and search Org-mode entries efficiently within VS Code.

## Quick Start

### 1. Where to use it?
In any `.org` file, you can create a `vorg-ql` code block. VOrg will automatically render the search results below when you save the file or click execute:

    #+begin_src vorg-ql
    (todo)
    #+end_src

### 2. Basic Search Logic
- **Simple Search**: Just write a double-quoted string, e.g., `"task"`, to fuzzy search in titles and Pinyin.
- **Structured Search**: Use parenthesized "predicates", like `(todo)` for incomplete tasks or `(priority "A")` for high priority.
- **Combined Search**: Combine multiple predicates using `(and ...)` or `(or ...)`.

---

## Detailed Reference (Predicates)

A VOrg-QL query consists of one or more **Predicates**.

- **Sexp Syntax**: `(predicate arg1 arg2 ...)`
- **Non-sexp Syntax**: Bare strings (e.g., `"task"`) are automatically converted to `(heading "task")`.

---

## Comparison Operators

Some predicates support comparison operators (`>`, `<`, `>=`, `<=`, `=`, `!=`) as the first argument.

- **Examples**: 
    - `(level < 3)` -> Find headings with level less than 3.
    - `(priority >= "B")` -> Find headings with priority A or B.
    - `(property "Age" > "18")` -> Numerical comparison of properties.

---

## Predicates

### General Predicates

| Predicate | Aliases | Description | Example |
| :--- | :--- | :--- | :--- |
| `todo` | `status`, `state` | Matches specific TODO keywords. Without args, matches all "incomplete" states. Supports comparison. | `(todo "NEXT")`, `(todo > "TODO")` |
| `done` | - | Matches all "completed" states. | `(done)` |
| `priority` | `prio`, `p` | Matches entry priority. Supports comparison. | `(priority "A")`, `(p < "B")` |
| `tag` | `#` | Matches associated tags. | `(tag "work")` |
| `heading` | `title`, `h` | Matches heading content (including Pinyin). | `(heading "refactor")` |
| `level` | - | Matches heading level. Supports comparison. | `(level 1)`, `(level <= 2)` |
| `property` | `prop` | Matches custom property key/value pairs. Supports comparison. | `(property "ID" "uuid")`, `(prop "Age" > "18")` |
| `file` | `src` | Restricts search to specific file paths. | `(file "inbox.org")` |

### Date/Time Predicates

All date predicates support:
- **Keywords**: `"today"`, `"today+1w"` (+/- n with units `d`, `w`, `m`, `y`).
- **Range arguments**: `:from`, `:to`, `:on`.

| Predicate | Aliases | Description | Example |
| :--- | :--- | :--- | :--- |
| `deadline` | `dl` | Matches deadline timestamps. | `(deadline :from today :to today+1w)` |
| `scheduled` | `sc` | Matches scheduled timestamps. | `(scheduled "2024-01-31")` |
| `closed` | - | Matches closed/completion timestamps. | `(closed today)` |

### Ancestor/Descendant Predicates

| Predicate | Aliases | Description | Example |
| :--- | :--- | :--- | :--- |
| `parent` | `up` | Matches by parent node's title (content). | `(parent "Project Plan")` |

---

## Logical Operators

Predicates can be nested to any depth using logical operators:

- **`(and ...)`**: True if all enclosed predicates are true.
- **`(or ...)`**: True if any enclosed predicates are true.
- **`(not ...)`**: Inverts the result of the enclosed predicate.

## Grouping

VOrg-QL supports visual grouping of results via the `group-by` wrapper.

### Grouping Syntax (`group-by`)
- **Syntax**: `(group-by field (query-predicates))`
- **Supported Fields**: 
    - `tag` / `#`: Group by tags.
    - `status` / `todo`: Group by TODO keywords.
    - `priority` / `prio` / `p`: Group by priority level.
    - `file` / `src`: Group by source file.
    - `done`: Group by completion category (todo vs done).
    - `level`: Group by heading level.
- **Example**: `(group-by priority (todo))` —— Search for all incomplete tasks and group them by priority.

---

## Examples

### Find high-priority tasks due today
```lisp
(and (todo) (deadline "today") (priority "A"))
```

### Find all items closed within the last week
```lisp
(closed :from today-1w :to today)
```

### Find all non-top-level tasks (level > 1) tagged as "urgent"
```lisp
(and (level > 1) (tag "urgent"))
```
