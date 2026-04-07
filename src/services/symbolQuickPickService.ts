import * as core from '../types/core';
import { HeadingParser } from '../parsers/headingParser';
import { getPinyinString } from '../utils/pinyinUtils';

export interface QuickPickSymbolEntry {
  label: string;
  description?: string;
  detail?: string;
  searchText: string;
  uri: string;
  line: number;
}

export interface QuickPickPresentationItem {
  label: string;
  description?: string;
  detail?: string;
  alwaysShow: boolean;
  entry: QuickPickSymbolEntry;
}

export interface WorkspaceQuickPickHeadingInput {
  uri: string;
  line: number;
  level: number;
  title: string;
  displayName: string;
  relativePath: string;
  pinyinText?: string;
  pinyinDisplayName?: string;
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function buildSearchText(parts: Array<string | undefined>): string {
  return normalizeText(parts.filter(Boolean).join(' '));
}

function buildOutlinePathForDocument(
  linesBeforeTarget: Array<{ level: number; title: string }>,
  targetLevel: number
): string[] {
  const path: string[] = [];
  let currentLevel = targetLevel;

  for (let i = linesBeforeTarget.length - 1; i >= 0; i--) {
    const heading = linesBeforeTarget[i];
    if (heading.level < currentLevel) {
      path.unshift(heading.title);
      currentLevel = heading.level;
      if (currentLevel === 1) {
        break;
      }
    }
  }

  return path;
}

export function buildDocumentSymbolQuickPickEntries(
  document: core.TextDocument,
  documentUri: string,
  todoKeywords: string[]
): QuickPickSymbolEntry[] {
  const entries: QuickPickSymbolEntry[] = [];
  const scannedHeadings: Array<{ level: number; title: string }> = [];

  for (let line = 0; line < document.lineCount; line++) {
    const headingInfo = HeadingParser.parseHeading(document.lineAt(line).text, true, todoKeywords);
    if (headingInfo.level === 0) {
      continue;
    }

    const pureTitle = (headingInfo.text || headingInfo.title || '').trim() || '(Untitled)';
    const displayName = HeadingParser.buildDisplayName(
      pureTitle,
      headingInfo.todoKeyword,
      headingInfo.tags || []
    );
    const outlinePath = buildOutlinePathForDocument(scannedHeadings, headingInfo.level);
    const outlinePathString = outlinePath.join(' > ');

    entries.push({
      label: displayName,
      description: outlinePathString || undefined,
      detail: `L${headingInfo.level} · Line ${line + 1}`,
      searchText: buildSearchText([
        displayName,
        pureTitle,
        outlinePathString,
        getPinyinString(pureTitle),
        getPinyinString(displayName),
        getPinyinString(outlinePathString),
      ]),
      uri: documentUri,
      line,
    });

    scannedHeadings.push({
      level: headingInfo.level,
      title: pureTitle,
    });
  }

  return entries;
}

function buildWorkspaceOutlinePath(
  target: WorkspaceQuickPickHeadingInput,
  headingsInSameFile: WorkspaceQuickPickHeadingInput[]
): string[] {
  const path: string[] = [];
  let currentLevel = target.level;

  for (let i = headingsInSameFile.length - 1; i >= 0; i--) {
    const heading = headingsInSameFile[i];
    if (heading.line >= target.line) {
      continue;
    }

    if (heading.level < currentLevel) {
      path.unshift(heading.title);
      currentLevel = heading.level;
      if (currentLevel === 1) {
        break;
      }
    }
  }

  return path;
}

export function buildWorkspaceSymbolQuickPickEntries(
  headings: WorkspaceQuickPickHeadingInput[]
): QuickPickSymbolEntry[] {
  const headingsByFile = new Map<string, WorkspaceQuickPickHeadingInput[]>();
  for (const heading of headings) {
    const existing = headingsByFile.get(heading.uri) || [];
    existing.push(heading);
    headingsByFile.set(heading.uri, existing);
  }

  for (const fileHeadings of headingsByFile.values()) {
    fileHeadings.sort((a, b) => a.line - b.line);
  }

  const sortedHeadings = [...headings].sort((a, b) => {
    if (a.relativePath !== b.relativePath) {
      return a.relativePath.localeCompare(b.relativePath);
    }
    return a.line - b.line;
  });

  return sortedHeadings.map((heading) => {
    const outlinePath = buildWorkspaceOutlinePath(
      heading,
      headingsByFile.get(heading.uri) || []
    );
    const outlinePathString = outlinePath.join(' > ');

    return {
      label: heading.displayName,
      description: heading.relativePath,
      detail: outlinePathString
        ? `${outlinePathString} · L${heading.level} · Line ${heading.line + 1}`
        : `L${heading.level} · Line ${heading.line + 1}`,
      searchText: buildSearchText([
        heading.displayName,
        heading.title,
        heading.relativePath,
        outlinePathString,
        heading.pinyinText,
        heading.pinyinDisplayName,
        getPinyinString(outlinePathString),
      ]),
      uri: heading.uri,
      line: heading.line,
    };
  });
}

function scoreEntry(entry: QuickPickSymbolEntry, terms: string[]): number {
  const label = normalizeText(entry.label);
  const description = normalizeText(entry.description || '');
  const detail = normalizeText(entry.detail || '');

  return terms.reduce((score, term) => {
    if (label === term) {
      return score + 120;
    }
    if (label.startsWith(term)) {
      return score + 80;
    }
    if (label.includes(term)) {
      return score + 60;
    }
    if (description.includes(term) || detail.includes(term)) {
      return score + 40;
    }
    return score + 20;
  }, 0);
}

export function filterQuickPickSymbolEntries(
  entries: QuickPickSymbolEntry[],
  query: string,
  maxResults: number = 200
): QuickPickSymbolEntry[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return entries.slice(0, maxResults);
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return entries
    .map((entry, index) => ({
      entry,
      index,
      score: terms.every(term => entry.searchText.includes(term))
        ? scoreEntry(entry, terms)
        : -1,
    }))
    .filter(item => item.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    })
    .slice(0, maxResults)
    .map(item => item.entry);
}

export function toQuickPickPresentationItems(
  entries: QuickPickSymbolEntry[]
): QuickPickPresentationItem[] {
  return entries.map(entry => ({
    label: entry.label,
    description: entry.description,
    detail: entry.detail,
    alwaysShow: true,
    entry,
  }));
}
