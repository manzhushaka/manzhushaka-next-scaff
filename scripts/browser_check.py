from pathlib import Path
import os
import re
from urllib.parse import unquote
from playwright.sync_api import sync_playwright


ARTIFACTS = Path('/Users/manzhushaka/.codex/visualizations/2026/08/15/01a0039d-ba10-7c40-a381-01db6d7dcdb7')
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def inspect_page(page, name: str, width: int, height: int) -> None:
    page.set_viewport_size({'width': width, 'height': height})
    page.goto('http://localhost:3000/login', wait_until='networkidle')
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

    page.set_viewport_size({'width': 1440, 'height': 960})
    page.goto('http://localhost:3000/dashboard', wait_until='networkidle')
    assert page.get_by_role('heading', name='工作台').is_visible()
    assert page.get_by_text('等待运行数据').is_visible()
    page.get_by_role('link', name='用户管理').click()
    page.wait_for_url('**/users')
    page.get_by_role('heading', name='用户管理').wait_for(state='visible')
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
    page.screenshot(path=str(ARTIFACTS / 'users-dark.png'), full_page=True)

    username = os.getenv('ADMIN_USERNAME')
    password = os.getenv('ADMIN_PASSWORD')
    if username and password:
        page.goto('http://localhost:3000/login', wait_until='networkidle')
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
