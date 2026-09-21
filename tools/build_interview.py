#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成面试题库索引 interviews/index.json。

两个来源合并：
  1. posts/*.md 里「## …高频面试题…」章节中的 `**Qn：问题**` 问答（自动抽取，改文章即同步）
  2. interviews/*.md 手写题库，题目块约定：`### [简答|代码] 题面` + 下方答案

用法：
    python tools/build_interview.py

新增/修改题目后运行一次即可。
"""

import os
import re
import sys
import json
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'posts')
INTERVIEWS_DIR = os.path.join(ROOT, 'interviews')
INDEX_PATH = os.path.join(INTERVIEWS_DIR, 'index.json')

FRONT_MATTER_RE = re.compile(r'\A---\s*\r?\n(.*?)\r?\n---\s*(?:\r?\n|\Z)', re.S)
POST_HEAD_RE = re.compile(r'^##\s+.*面试题.*$', re.M)
H2_RE = re.compile(r'^##\s+', re.M)
POST_Q_RE = re.compile(r'^\*\*Q(\d+)：(.*?)\*\*\s*$', re.M)
BLOCK_RE = re.compile(r'^###\s+(.*)$', re.M)
TYPE_TAG_RE = re.compile(r'^\[(简答|代码|多选|判断)\]\s*(.*)$')
CODE_Q_HINT_RE = re.compile(r'(手写|写一个|编写一个|实现一个|用代码|代码实现|写一段|写出|请写)')
TITLE_TOPIC_RE = re.compile(r'第\s*\d+\s*章\s*[：:]\s*(.+?)\s*$')
HR_RE = re.compile(r'^-{3,}$')


def parse_front_matter(text):
    """返回 (meta_dict, body)。"""
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
    value = str(value or '').strip()
    if value.startswith('[') and value.endswith(']'):
        value = value[1:-1]
    return [t.strip().strip('"\'') for t in value.split(',') if t.strip()]


def norm_category(raw):
    """把文章分类收敛成题库的一级分类。"""
    text = str(raw or '')
    if 'Python' in text or 'python' in text:
        return 'Python'
    if 'MySQL' in text or 'mysql' in text:
        return 'MySQL'
    return text or '未分类'


def topic_from_title(title):
    match = TITLE_TOPIC_RE.search(str(title or ''))
    return match.group(1).strip() if match else str(title or '').strip()


def clean_answer(text):
    """去掉结尾的 --- 分隔线与空白。"""
    lines = str(text or '').rstrip().split('\n')
    while lines and (not lines[-1].strip() or HR_RE.match(lines[-1].strip())):
        lines.pop()
    return '\n'.join(lines).strip()


def extract_from_posts():
    questions = []
    if not os.path.isdir(POSTS_DIR):
        return questions

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
            continue

        head = POST_HEAD_RE.search(body)
        if not head:
            continue
        tail = H2_RE.search(body, head.end())
        section = body[head.end(): tail.start() if tail else len(body)]

        slug = name[:-3]
        category = norm_category(meta.get('category'))
        topic = topic_from_title(meta.get('title') or slug)

        marks = list(POST_Q_RE.finditer(section))
        for idx, mark in enumerate(marks):
            num = mark.group(1)
            question = mark.group(2).strip()
            start = mark.end()
            end = marks[idx + 1].start() if idx + 1 < len(marks) else len(section)
            answer = clean_answer(section[start:end])
            if not question or not answer:
                continue
            questions.append({
                'id': '%s#q%s' % (slug, num),
                'category': category,
                'topic': topic,
                'type': '代码' if CODE_Q_HINT_RE.search(question) else '简答',
                'difficulty': '中',
                'tags': [],
                'question': question,
                'answer': answer,
                'source': name,
            })
    return questions


def extract_from_interviews():
    questions = []
    if not os.path.isdir(INTERVIEWS_DIR):
        return questions

    for name in sorted(os.listdir(INTERVIEWS_DIR)):
        if not name.lower().endswith('.md'):
            continue
        path = os.path.join(INTERVIEWS_DIR, name)
        if not os.path.isfile(path):
            continue
        with open(path, encoding='utf-8') as fp:
            raw = fp.read()

        meta, body = parse_front_matter(raw)
        if not meta.get('category'):
            print('    [跳过] %s：缺少 front-matter category' % name)
            continue

        category = norm_category(meta.get('category'))
        topic = meta.get('topic') or '综合'
        difficulty = meta.get('difficulty') or '中'
        tags = parse_tags(meta.get('tags'))
        slug = name[:-3]

        blocks = list(BLOCK_RE.finditer(body))
        for idx, block in enumerate(blocks):
            heading = block.group(1).strip()
            tag = TYPE_TAG_RE.match(heading)
            if tag:
                qtype, question = tag.group(1), tag.group(2).strip()
            else:
                qtype, question = '简答', heading
            start = block.end()
            end = blocks[idx + 1].start() if idx + 1 < len(blocks) else len(body)
            answer = clean_answer(body[start:end])
            if not question:
                continue
            questions.append({
                'id': '%s#%d' % (slug, idx + 1),
                'category': category,
                'topic': topic,
                'type': qtype,
                'difficulty': difficulty,
                'tags': tags,
                'question': question,
                'answer': answer,
                'source': name,
            })
    return questions


def question_key(text):
    """把题干归一化成去重键：去掉标点、空白、大小写与 markdown 标记。"""
    plain = re.sub(r'[`*_>#\[\]()]', '', str(text or '')).lower()
    return re.sub(r'[\s\u3000，。？！、：；,.:;!?\-—/\\|"\'“”‘’]+', '', plain)


def main():
    if not os.path.isdir(INTERVIEWS_DIR):
        print('[x] 目录不存在: %s' % INTERVIEWS_DIR)
        return 1

    questions = extract_from_posts() + extract_from_interviews()

    seen_id, seen_text = set(), {}
    unique = []
    for item in questions:
        if item['id'] in seen_id:
            print('    [警告] 重复 id 已跳过: %s' % item['id'])
            continue
        seen_id.add(item['id'])

        key = question_key(item['question'])
        if key and key in seen_text:
            print('    [跳过重复题] %s（与 %s 重复）' % (item['question'][:32], seen_text[key]))
            continue
        if key:
            seen_text[key] = item['id']
        unique.append(item)

    unique.sort(key=lambda q: (q['category'], q['topic'], q['source'], q['id']))

    categories = sorted({q['category'] for q in unique})
    types = sorted({q['type'] for q in unique})

    payload = {
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'count': len(unique),
        'categories': categories,
        'types': types,
        'questions': unique,
    }
    with open(INDEX_PATH, 'w', encoding='utf-8') as fp:
        json.dump(payload, fp, ensure_ascii=False, indent=2)
        fp.write('\n')

    print('[√] 已生成 %s' % INDEX_PATH)
    print('    题目总数 %d' % len(unique))
    for cat in categories:
        items = [q for q in unique if q['category'] == cat]
        by_type = {}
        for q in items:
            by_type[q['type']] = by_type.get(q['type'], 0) + 1
        detail = '，'.join('%s %d' % (k, v) for k, v in sorted(by_type.items()))
        print('    - %s %d 题（%s）' % (cat, len(items), detail))
    return 0


if __name__ == '__main__':
    sys.exit(main())
