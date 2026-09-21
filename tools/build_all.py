#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""一键重建全部索引：文章索引 + 面试题库索引。

用法：
    python tools/build_all.py

新增/修改文章后，或新增/修改面试题后，运行本脚本即可。
"""

import os
import sys
import runpy

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))


def run(script_name):
    script = os.path.join(TOOLS_DIR, script_name)
    print('=== %s ===' % script_name)
    try:
        runpy.run_path(script, run_name='__main__')
    except SystemExit as exc:
        if exc.code not in (0, None):
            return int(exc.code)
    return 0


def main():
    code = run('build_index.py')
    print('')
    code |= run('build_interview.py')
    print('\n[√] 全部索引已更新' if code == 0 else '\n[x] 存在失败项')
    return code


if __name__ == '__main__':
    sys.exit(main())
