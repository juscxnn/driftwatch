import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DataTable, type Column } from './data-table';

type Row = { id: string; name: string; score: number; tag: string };

const columns: Column<Row>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (r) => r.name,
    sortBy: (r) => r.name,
  },
  {
    key: 'score',
    header: 'Score',
    cell: (r) => <span className="num">{r.score}</span>,
    sortBy: (r) => r.score,
  },
  {
    key: 'tag',
    header: 'Tag',
    cell: (r) => r.tag,
  },
];

const rows: Row[] = [
  { id: '1', name: 'bravo', score: 30, tag: 'B' },
  { id: '2', name: 'alpha', score: 10, tag: 'A' },
  { id: '3', name: 'charlie', score: 20, tag: 'C' },
];

describe('DataTable', () => {
  it('renders rows from the rows prop', () => {
    const html = renderToString(
      <DataTable<Row> rows={rows} rowKey={(r) => r.id} columns={columns} />,
    );
    expect(html).toContain('bravo');
    expect(html).toContain('alpha');
    expect(html).toContain('charlie');
    expect(html).toContain('>30<');
  });

  it('renders emptyState prop when rows is empty and no search query', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={[]}
        rowKey={(r) => r.id}
        columns={columns}
        emptyState={<div data-testid="empty">No projects yet</div>}
      />,
    );
    expect(html).toContain('No projects yet');
    expect(html).not.toContain('bravo');
  });

  it('sorts ascending by defaultSort string column', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        defaultSort={{ key: 'name', direction: 'asc' }}
      />,
    );
    const aIdx = html.indexOf('alpha');
    const bIdx = html.indexOf('bravo');
    const cIdx = html.indexOf('charlie');
    expect(aIdx).toBeGreaterThan(-1);
    expect(bIdx).toBeGreaterThan(-1);
    expect(cIdx).toBeGreaterThan(-1);
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });

  it('sorts descending when defaultSort direction is desc (toggle behavior)', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        defaultSort={{ key: 'name', direction: 'desc' }}
      />,
    );
    expect(html.indexOf('charlie')).toBeLessThan(html.indexOf('bravo'));
    expect(html.indexOf('bravo')).toBeLessThan(html.indexOf('alpha'));
  });

  it('sorts numerically by sortBy returning a number', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        defaultSort={{ key: 'score', direction: 'asc' }}
      />,
    );
    expect(html.indexOf('>10<')).toBeLessThan(html.indexOf('>20<'));
    expect(html.indexOf('>20<')).toBeLessThan(html.indexOf('>30<'));
  });

  it('filters rows when search has a value', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        search={{
          value: 'alph',
          onChange: () => {},
          match: (r, q) => r.name.toLowerCase().includes(q.toLowerCase()),
        }}
      />,
    );
    expect(html).toContain('alpha');
    expect(html).not.toContain('bravo');
    expect(html).not.toContain('charlie');
  });

  it('shows "No results for" message when search produces no matches', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        search={{
          value: 'zzz',
          onChange: () => {},
          match: () => false,
        }}
      />,
    );
    expect(html).toContain('No results for');
    expect(html).toContain('zzz');
  });

  it('renders skeleton rows when isLoading is true', () => {
    const html = renderToString(
      <DataTable<Row>
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        isLoading
      />,
    );
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('bravo');
    expect(html).not.toContain('alpha');
    expect(html).not.toContain('charlie');
  });
});
