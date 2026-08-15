from pathlib import Path
import os
import re
from urllib.parse import unquote
from playwright.sync_api import sync_playwright


ARTIFACTS = Path('/Users/manzhushaka/.codex/visualizations/2026/08/15/01a005cc-db97-7142-bdd8-40e2d43f3496')
ARTIFACTS.mkdir(parents=True, exist_ok=True)
BASE_URL = os.getenv('WEB_BASE_URL', 'http://localhost:3000')


def inspect_page(page, name: str, width: int, height: int) -> None:
    page.set_viewport_size({'width': width, 'height': height})
    page.goto(f'{BASE_URL}/login', wait_until='networkidle')
    page.wait_for_timeout(500)
    page.screenshot(path=str(ARTIFACTS / f'{name}.png'), full_page=True)
    assert page.get_by_role('heading', name='欢迎回来').is_visible()
    assert page.get_by_label('用户名').is_visible()
    assert page.get_by_role('button', name='刷新验证码').is_visible()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    errors: list[str] = []
    page.on('console', lambda message: errors.append(f'console:{message.type}:{message.text}') if message.type == 'error' else None)
    page.on('pageerror', lambda error: errors.append(f'pageerror:{error}'))

    inspect_page(page, 'login-desktop', 1440, 960)
    inspect_page(page, 'login-mobile', 390, 844)
    assert page.get_by_role('button', name='显示密码').is_visible()

    page.set_viewport_size({'width': 1440, 'height': 960})
    page.goto(f'{BASE_URL}/dashboard', wait_until='networkidle')
    assert page.get_by_role('heading', name='欢迎回来').is_visible()
    assert page.get_by_text('等待运行数据').is_visible()
    page.get_by_label('主导航').get_by_role('link', name='用户管理').click()
    page.wait_for_url('**/users')
    page.get_by_role('heading', name='用户管理').wait_for(state='visible')
    assert page.locator('.arco-table').count() == 1
    assert page.locator('.arco-input').count() == 1
    assert page.locator('.arco-btn').count() >= 3
    assert page.locator('.arco-pagination').count() == 1
    status_select = page.get_by_role('combobox', name='状态')
    assert status_select.inner_text() == '全部状态'
    status_select.click()
    status_options = page.get_by_role('listbox', name='状态选项').get_by_role('option')
    assert status_options.count() == 3
    status_options.get_by_text('正常', exact=True).click()
    assert status_select.inner_text() == '正常'
    page.keyboard.press('Escape')
    page.get_by_role('button', name='新增记录').click()
    editor = page.get_by_role('dialog', name='新增记录')
    assert editor.is_visible()
    editor.get_by_role('button', name='保存').click()
    assert editor.get_by_role('alert').get_by_text('请输入用户名').is_visible()
    editor.get_by_placeholder('输入用户名').fill('交互草稿')
    editor.get_by_role('button', name='保存').click()
    assert page.get_by_text('草稿已保留').is_visible()
    editor.get_by_role('button', name='关闭', exact=True).click()
    discard_dialog = page.get_by_role('alertdialog', name='放弃未保存的修改？')
    assert discard_dialog.is_visible()
    discard_dialog.get_by_role('button', name='放弃修改').click()
    assert not editor.is_visible()
    page.get_by_role('button', name='通知').click()
    assert page.get_by_role('dialog', name='通知中心').is_visible()
    page.keyboard.press('Escape')
    page.get_by_role('button', name='账户菜单').click()
    assert page.get_by_role('dialog', name='账户菜单').is_visible()
    page.keyboard.press('Escape')
    assert page.locator('.arco-btn:has(svg)').evaluate_all(
        """
        (buttons) => buttons.every((button) => {
          const buttonRect = button.getBoundingClientRect();
          const iconRect = button.querySelector('svg').getBoundingClientRect();
          const labelRect = button.querySelector('span').getBoundingClientRect();
          const centerDelta = Math.abs(
            iconRect.top + iconRect.height / 2 - (buttonRect.top + buttonRect.height / 2),
          );
          return centerDelta <= 1 && labelRect.top >= buttonRect.top && labelRect.bottom <= buttonRect.bottom;
        })
        """
    )
    page.get_by_role('button', name='亮色').click()
    assert page.locator('body[arco-theme="light"]').count() == 1
    primary_button = page.get_by_role('button', name='查询')
    assert primary_button.evaluate('(element) => getComputedStyle(element).backgroundColor') == 'rgb(22, 93, 255)'
    page.evaluate('document.activeElement.blur()')
    for _ in range(40):
        page.keyboard.press('Tab')
        if primary_button.evaluate('(element) => document.activeElement === element'):
            break
    assert primary_button.evaluate('(element) => document.activeElement === element')
    assert primary_button.evaluate('(element) => getComputedStyle(element).outlineStyle') != 'none'
    page.screenshot(path=str(ARTIFACTS / 'users-light.png'), full_page=True)
    page.get_by_label('搜索当前资源').fill('保留页面状态')
    page.get_by_label('主导航').get_by_role('link', name='角色管理').click()
    page.wait_for_url('**/roles')
    page.get_by_role('heading', name='角色管理').wait_for(state='visible')
    page.get_by_role('tab', name='用户管理', exact=True).click()
    page.wait_for_url('**/users')
    assert page.get_by_label('搜索当前资源').input_value() == '保留页面状态'
    page.get_by_role('button', name='页签管理').click()
    assert page.get_by_role('menu', name='用户管理页签操作').is_visible()
    page.keyboard.press('Escape')
    organization_group = page.get_by_role('button', name='组织管理')
    organization_items = page.locator('#nav-group-组织管理')
    assert organization_group.get_attribute('aria-expanded') == 'true'
    assert not organization_items.is_hidden()
    organization_group.click()
    assert organization_group.get_attribute('aria-expanded') == 'false'
    assert organization_items.is_hidden()
    organization_group.click()
    assert organization_group.get_attribute('aria-expanded') == 'true'
    assert not organization_items.is_hidden()
    page.get_by_role('button', name='暗色').click()
    assert page.locator('html.dark').count() == 1
    assert page.locator('body[arco-theme="dark"]').count() == 1
    page.wait_for_timeout(200)
    dark_primary_color = primary_button.evaluate('(element) => getComputedStyle(element).backgroundColor')
    assert dark_primary_color == 'rgb(64, 128, 255)', f'暗色主按钮计算色异常：{dark_primary_color}'
    page.screenshot(path=str(ARTIFACTS / 'users-dark.png'), full_page=True)

    page.set_viewport_size({'width': 1440, 'height': 600})
    page.goto(f'{BASE_URL}/users', wait_until='networkidle')
    scroll_container = page.locator('[data-console-scroll]')
    scroll_container.evaluate('(element) => element.scrollTo(0, 220)')
    page.wait_for_timeout(100)
    scroll_layout = scroll_container.evaluate(
        """
        (element) => {
          const headerRect = element.querySelector(':scope > header').getBoundingClientRect();
          const sidebarRect = document.querySelector('aside').getBoundingClientRect();
          const brandRect = document.querySelector('aside > div').getBoundingClientRect();
          return {
            scrollTop: element.scrollTop,
            windowScrollY: window.scrollY,
            headerTop: headerRect.top,
            headerBottom: headerRect.bottom,
            sidebarTop: sidebarRect.top,
            brandBottom: brandRect.bottom,
          };
        }
        """
    )
    assert scroll_layout['scrollTop'] > 0
    expected_scroll_top = scroll_layout['scrollTop']
    assert scroll_layout['windowScrollY'] == 0
    assert abs(scroll_layout['headerTop']) <= 1
    assert abs(scroll_layout['sidebarTop']) <= 1
    assert abs(scroll_layout['headerBottom'] - scroll_layout['brandBottom']) <= 1
    page.get_by_label('主导航').get_by_role('link', name='角色管理').click()
    page.wait_for_url('**/roles')
    page.get_by_role('tab', name='用户管理', exact=True).click()
    page.wait_for_url('**/users')
    page.wait_for_timeout(100)
    restored_scroll_top = scroll_container.evaluate('(element) => element.scrollTop')
    assert abs(restored_scroll_top - expected_scroll_top) <= 1, f'页签滚动位置未恢复：{restored_scroll_top}'
    page.screenshot(path=str(ARTIFACTS / 'users-scrolled.png'), full_page=True)

    page.goto(f'{BASE_URL}/async-tasks', wait_until='networkidle')
    page.get_by_role('heading', name='异步任务').wait_for(state='visible')
    assert page.get_by_role('tab', name='全部').is_visible()
    page.get_by_role('button', name='创建任务').click()
    task_panel = page.get_by_role('dialog', name='创建异步任务')
    assert task_panel.is_visible()
    task_panel.get_by_role('button', name='关闭', exact=True).click()
    assert not task_panel.is_visible()

    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(f'{BASE_URL}/users', wait_until='networkidle')
    assert page.get_by_role('button', name='打开菜单', exact=True).is_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth')
    page.get_by_role('button', name='打开菜单', exact=True).click()
    page.wait_for_timeout(250)
    sidebar = page.locator('aside')
    assert sidebar.evaluate('(element) => element.getBoundingClientRect().left >= -1')
    page.screenshot(path=str(ARTIFACTS / 'users-mobile-menu.png'), full_page=True)
    page.mouse.move(180, 300)
    page.mouse.down()
    page.mouse.move(20, 300, steps=8)
    page.mouse.up()
    page.wait_for_timeout(250)
    assert sidebar.evaluate('(element) => element.getBoundingClientRect().right <= 1')

    username = os.getenv('ADMIN_USERNAME')
    password = os.getenv('ADMIN_PASSWORD')
    if username and password:
        page.goto(f'{BASE_URL}/login', wait_until='networkidle')
        page.wait_for_selector('img[alt="图片验证码"]')
        source = page.locator('img[alt="图片验证码"]').get_attribute('src') or ''
        match = re.search(r'<text[^>]*>(\d{4})</text>', unquote(source))
        assert match, '验证码图片内容不可读取'
        page.get_by_label('用户名').fill(username)
        page.get_by_label('密码').fill(password)
        page.get_by_placeholder('输入图中数字').fill(match.group(1))
        page.get_by_role('button', name='进入控制台').click()
        page.wait_for_url('**/force-change-password')
        assert page.get_by_text('首次登录安全设置').is_visible()

    if errors:
        raise AssertionError('\n'.join(errors))
    browser.close()
