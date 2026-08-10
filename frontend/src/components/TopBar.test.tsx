import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from './TopBar';

function renderBar(props?: Partial<Parameters<typeof TopBar>[0]>) {
  return render(
    <TopBar
      onFocusSearch={() => {}}
      onOpenFilter={() => {}}
      filterActive={false}
      resultCount={null}
      {...props}
    />,
  );
}

describe('TopBar', () => {
  it('渲染品牌标题', () => {
    renderBar();
    expect(screen.getByText('企业微信会话存档')).toBeInTheDocument();
  });

  it('点击搜索触发 onFocusSearch', async () => {
    const onFocusSearch = vi.fn();
    renderBar({ onFocusSearch });
    await userEvent.click(screen.getByLabelText('搜索会话'));
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('点击筛选触发 onOpenFilter', async () => {
    const onOpenFilter = vi.fn();
    renderBar({ onOpenFilter });
    await userEvent.click(screen.getByLabelText('搜索与筛选'));
    expect(onOpenFilter).toHaveBeenCalledTimes(1);
  });

  it('filterActive 显示命中条', () => {
    renderBar({ filterActive: true, resultCount: 5 });
    expect(screen.getByText('命中 5 条')).toBeInTheDocument();
  });

  it('导出按钮处于禁用态', () => {
    renderBar();
    expect(screen.getByTitle('即将上线')).toBeDisabled();
  });
});
