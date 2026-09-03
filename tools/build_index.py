#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""扫描 posts/*.md，解析 YAML front-matter，生成 posts/index.json。

用法：
    python tools/build_index.py

新增或修改文章（尤其是标题/日期/标签）后运行一次即可。
"""

import os
import re
import sys
import json
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'posts')
INDEX_PATH = os.path.join(POSTS_DIR, 'index.json')

FRONT_MATTER_RE = re.compile(r'\A---\s*\r?\n(.*?)\r?\n---\s*(?:\r?\n|\Z)', re.S)
CJK_RE = re.compile(r'[\u4e00-\u9fff]')
WORD_RE = re.compile(r'[A-Za-z0-9]+')


def parse_front_matter(text):
    """返回 (meta_dict, body)。没有 front-matter 时 meta 为空字典。"""
    match = FRONT_MATTER_RE.match(text)
    if not match:
        return {}, text
    meta = {}
    for line in match.group(1).splitlines():
        line = line.strip()
        if not line or line.startswith('#') or ':' not in line:
            continue
        key, value = line.split(':', 1)
        meta[key.strip().lower()] = value.strip()
    return meta, text[match.end():]


def parse_tags(value):
    """支持 [a, b] 与 a, b 两种写法。"""
    value = value.strip()
    if value.startswith('[') and value.endswith(']'):
        value = value[1:-1]
    return [t.strip().strip('"\'') for t in value.split(',') if t.strip()]


def normalize_date(value, fallback_path):
    """把 2026/9/1、2026-9-1 统一成 2026-09-01。"""
    value = (value or '').strip().replace('/', '-')
    if value:
        parts = value.split('-')
        if len(parts) == 3 and all(p.isdigit() for p in parts):
            try:
                return datetime(int(parts[0]), int(parts[1]), int(parts[2])).strftime('%Y-%m-%d')
            except ValueError:
                pass
    mtime = os.path.getmtime(fallback_path)
    return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')


def strip_markdown(text):
    text = re.sub(r'```.*?```', ' ', text, flags=re.S)
    text = re.sub(r'`[^`]*`', ' ', text)
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'^[#>\-\*\|\s]+', ' ', text, flags=re.M)
    return re.sub(r'\s+', ' ', text).strip()


def make_summary(meta, body, limit=110):
    if meta.get('summary'):
        return meta['summary'].strip().strip('"\'')
    plain = strip_markdown(body)
    return (plain[:limit] + '...') if len(plain) > limit else plain


def count_words(body):
    return len(CJK_RE.findall(body)) + len(WORD_RE.findall(body))


def main():
    if not os.path.isdir(POSTS_DIR):
        print('[x] 目录不存在: %s' % POSTS_DIR)
        return 1

    posts, skipped = [], []
    for name in sorted(os.listdir(POSTS_DIR)):
        if not name.lower().endswith('.md'):
            continue
        path = os.path.join(POSTS_DIR, name)
        if not os.path.isfile(path):
            continue
        with open(path, encoding='utf-8') as fp:
            raw = fp.read()

        meta, body = parse_front_matter(raw)
        if str(meta.get('draft', 'false')).lower() in ('true', 'yes', '1'):
            skipped.append(name)
            continue

        posts.append({
            'slug': name[:-3],
            'title': meta.get('title') or name[:-3],
            'date': normalize_date(meta.get('date'), path),
            'category': meta.get('category') or '未分类',
            'tags': parse_tags(meta.get('tags', '')),
            'summary': make_summary(meta, body),
            'words': count_words(body),
        })

    # 两趟稳定排序：日期倒序；同一天按标题升序（保证连载章节按章序排列）
    posts.sort(key=lambda p: p['title'])
    posts.sort(key=lambda p: p['date'], reverse=True)

    payload = {
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'count': len(posts),
        'posts': posts,
    }
    with open(INDEX_PATH, 'w', encoding='utf-8') as fp:
        json.dump(payload, fp, ensure_ascii=False, indent=2)
        fp.write('\n')

    print('[√] 已生成 %s' % INDEX_PATH)
    print('    文章 %d 篇%s' % (len(posts), ('，跳过草稿 %d 篇' % len(skipped)) if skipped else ''))
    for post in posts:
        print('    - %s  [%s]  %s' % (post['date'], post['category'], post['title']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
