---
title: Python 基础笔记 · 第 7 章：常用标准库模块
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 标准库, os, pathlib, datetime, collections]
summary: os/pathlib、sys、time/datetime、json/pickle、collections、itertools、functools、logging、hashlib、enum、typing、subprocess 等高频模块的核心用法、原理与面试常问点，附可直接复用的代码片段。
---

## 一、核心知识点

Python 自带「电池」，标准库覆盖文件、时间、序列化、并发、命令行等几乎所有日常需求。本节按模块逐一拆解，每个模块都给出最小可用示例与面试要点。建议：新代码优先用更现代的 `pathlib`、类型注解、上下文管理器写法。

### 1. os：与操作系统交互

`os` 提供跨平台的进程/文件/环境操作。路径字符串处理建议配合 `os.path`，但更推荐下文的 `pathlib`。

```python
import os

os.getcwd()                       # => 当前工作目录，如 '/home/user/project'
os.listdir('.')                   # => 列出目录下的文件名列表
os.mkdir('tmp')                   # 创建单层目录（父目录不存在则 FileNotFoundError）
os.makedirs('a/b/c', exist_ok=True)  # 递归创建，exist_ok 避免已存在时报错
os.remove('a.txt')               # 删除文件（不能删目录）
os.rename('a.txt', 'b.txt')      # 重命名 / 移动
os.environ.get('PATH')           # => 读取环境变量（dict 形式）
os.path.join('a', 'b')           # => 跨平台拼接路径 'a/b'（win 下 'a\\b'）
os.path.exists('b.txt')          # => bool，判断是否存在
```

> 注意：`os.remove` 不可逆；删除目录用 `os.rmdir`（空目录）或 `shutil.rmtree`（递归，危险）。

### 2. pathlib.Path：面向对象的现代路径处理（推荐）

`pathlib` 把路径变成对象，支持 `/` 拼接、链式调用，自带读写文本、glob 等方法，代码更短更不易出错。新项目首选它。

```python
from pathlib import Path

p = Path('data') / 'raw.csv'      # 用 / 拼接路径，返回新的 Path 对象
p.exists()                        # => bool
p.is_file()                       # => 是否为文件
p.name, p.suffix, p.parent        # => 'raw.csv' '.csv' PosixPath('data')
p.mkdir(parents=True, exist_ok=True)   # 递归创建
text = p.read_text(encoding='utf-8')   # 一行读文件（自动关）
p.write_text('内容', encoding='utf-8') # 一行写文件
for f in p.parent.glob('*.csv'):       # 当前目录通配
    print(f)
for f in Path('.').rglob('*.py'):      # 递归通配
    print(f)
p.resolve()                       # => 绝对路径，解析 .. 和符号链接
```

### 3. sys：解释器与运行环境

```python
import sys

sys.argv            # => 命令行参数列表，argv[0] 是脚本名
sys.exit(1)         # 退出程序，状态码 1 表示异常
sys.path            # => 模块搜索路径列表（可 append）
sys.platform        # => 'win32' / 'linux' / 'darwin'
sys.stdout.write('hi\n')     # 标准输出
sys.stderr.write('err\n')    # 标准错误，日志/报错走这里
sys.modules         # => 已导入模块字典
sys.getsizeof(obj)  # => 对象占用的字节数（含 GC 头部，非内容大小）
```

```python
import sys
data = [0] * 1000
print(sys.getsizeof(data))        # => 如 8056 字节
```

### 4. datetime 与 time：日期时间处理

`time` 偏底层（时间戳、休眠、高精度计时），`datetime` 提供日期时间对象，业务开发以 `datetime` 为主。

```python
import time
from datetime import date, time as dtime, datetime, timedelta, timezone

time.time()                       # => 时间戳（秒，float）
time.sleep(1.5)                   # 阻塞 1.5 秒
time.perf_counter()               # 高精度计时（测性能用它，别用 time.time）
time.localtime()                  # => 本地时间 struct_time

today = date(2026, 9, 3)          # => date 对象
now = datetime.now()              # 本地时间（naive，无时区）
aware = datetime.now(timezone(timedelta(hours=8)))   # aware（有时区）
now.strftime('%Y-%m-%d %H:%M:%S')  # datetime -> str
datetime.strptime('2026-09-03', '%Y-%m-%d')  # str -> datetime
now + timedelta(days=7, hours=3)  # 日期加减
```

naive vs aware：无时区的 datetime 是 naive，有时区的是 aware。两者**不能相减/比较**，否则抛 `TypeError`。涉及时区请统一用 aware 或统一用时间戳。

### 5. json：跨语言数据交换

```python
import json

s = json.dumps({'名字': '小明', '年龄': 18},
               ensure_ascii=False, indent=2)   # ensure_ascii=False 才能输出中文
print(s)                          # => 漂亮的中文 JSON 字符串
obj = json.loads(s)               # str -> Python 对象
with open('a.json', 'w', encoding='utf-8') as f:
    json.dump(obj, f, ensure_ascii=False)      # 直接写文件
with open('a.json', encoding='utf-8') as f:
    obj = json.load(f)            # 直接读文件
```

序列化自定义对象用 `default`：

```python
import json
class User:
    def __init__(self, name):
        self.name = name
u = User('小明')
json.dumps(u, default=lambda o: o.__dict__)    # => '{"name": "小明"}'
json.dumps(u, default=str)                      # 兜底转字符串
```

Python 与 JSON 类型对照：`dict↔object`、`list/tuple↔array`、`str`、`int/float`、`True/False/None ↔ true/false/null`。

### 6. pickle：任意对象的二进制序列化（谨慎使用）

```python
import pickle

b = pickle.dumps({'a': 1})      # 对象 -> bytes
obj = pickle.loads(b)           # bytes -> 对象（还原类型）
with open('data.pkl', 'wb') as f:
    pickle.dump(obj, f)
```

> **安全红线**：pickle 反序列化时会执行对象里的代码，反序列化**不可信数据等于远程代码执行（RCE）**。只用于本地、可信数据的持久化，绝不要用它接收网络/用户输入。跨语言或不可信场景一律用 json。

| 对比 | json | pickle |
| --- | --- | --- |
| 格式 | 文本，跨语言 | Python 私有二进制 |
| 安全 | 安全 | 反序列化不可信数据可执行任意代码 |
| 支持类型 | 基础类型 | 几乎任意 Python 对象 |

### 7. random 与 secrets：随机

```python
import random

random.random()                  # => [0, 1) 浮点
random.randint(1, 10)            # => [1, 10] 闭区间
random.choice(['a', 'b'])        # 随机取一个
random.sample(range(10), k=3)    # 取 3 个不重复
random.shuffle([1, 2, 3])        # 原地打乱
random.seed(42)                  # 固定种子，结果可复现（测试用）
```

```python
import secrets
secrets.token_hex(16)            # 密码学安全随机令牌（生成令牌/密码用这个）
```

`random` 是**伪随机**（梅森旋转算法，给定种子可复现），可预测，**不能用于安全场景**；令牌、验证码、密码用 `secrets`。

### 8. math 与 decimal：数学计算与精确小数

```python
import math
math.isclose(0.1 + 0.2, 0.3)     # => True，浮点比较用 isclose 而非 ==
math.ceil(2.1)                   # => 3
math.comb(5, 2)                  # => 10，组合数
math.perm(5, 2)                  # => 20，排列数
math.gcd(12, 18)                 # => 6
```

浮点有精度误差（`0.1 + 0.2 != 0.3`）。金融场景要精确小数，用 `decimal`：

```python
from decimal import Decimal, getcontext
getcontext().prec = 28           # 全局精度
Decimal('0.1') + Decimal('0.2')  # => Decimal('0.3') 精确
Decimal('1.1') * Decimal('3')    # => Decimal('3.3')
```

### 9. collections：增强容器

```python
from collections import Counter, defaultdict, deque, namedtuple, ChainMap, OrderedDict

c = Counter('banana')
c.most_common(2)                 # => [('a', 3), ('n', 2)]
c['x'] += 1                       # 不存在的 key 自动从 0 开始

d = defaultdict(list)
d['k'].append(1)                 # 免 setdefault 判断

q = deque(maxlen=3)
q.appendleft(1); q.append(2); q.pop()   # 双端 O(1)

Point = namedtuple('Point', 'x y')     # 轻量数据载体
p = Point(1, 2); p.x                   # => 1

m = ChainMap({'a': 1}, {'b': 2})       # 多个 dict 逻辑合并，查找按顺序
m['a']                                 # => 1
```

- `Counter`：词频统计、TopN。
- `defaultdict`：分组聚合、免判断。
- `deque`：队列、栈、滑动窗口（线程安全仅限 `append/pop` 两端）。
- `ChainMap`：多个映射合成一个视图（配置优先级合并）。
- `OrderedDict`：保持插入顺序（3.7+ 普通 dict 已有序，但 `move_to_end` 等仍需它）。

### 10. itertools：迭代器工具

```python
from itertools import count, cycle, repeat, chain, islice, product, permutations, combinations, groupby, accumulate

list(islice(count(10), 5))        # => [10, 11, 12, 13, 14] 无限计数
list(islice(cycle('AB'), 4))      # => ['A', 'B', 'A', 'B'] 循环
list(repeat(7, 3))                # => [7, 7, 7]
list(chain([1, 2], [3, 4]))       # => [1, 2, 3, 4] 串联
list(product('AB', '12'))          # => 笛卡尔积
list(permutations('ABC', 2))       # => 排列（考虑顺序）
list(combinations('ABC', 2))       # => 组合（不重复、不管顺序）
list(accumulate([1, 2, 3]))        # => [1, 3, 6] 前缀和
```

`groupby` 必须先按同一 key 排序，否则相同 key 会分散到多组：

```python
from itertools import groupby
data = sorted(['a1', 'a2', 'b1'], key=lambda x: x[0])
for k, g in groupby(data, key=lambda x: x[0]):
    print(k, list(g))             # => a ['a1','a2']  b ['b1']
```

### 11. functools：函数式工具

```python
from functools import lru_cache, partial, reduce, wraps

@lru_cache(maxsize=None)          # 记忆化缓存，参数必须可哈希
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
fib(50)                           # 瞬间返回
print(fib.cache_info())           # 命中/未命中统计

int2 = partial(int, base=2)       # 冻结部分参数
int2('101')                       # => 5

reduce(lambda a, b: a * b, [1, 2, 3, 4])   # => 24 归约

def deco(f):
    @wraps(f)                     # 保留原函数名/文档
    def wrapper(*a, **k):
        return f(*a, **k)
    return wrapper
```

`lru_cache` 加速斐波那契：朴素递归是指数级，加缓存后变成线性（每个 n 只算一次）。注意被缓存函数应是**纯函数**、参数可哈希。

### 12. argparse：命令行参数解析

```python
import argparse
parser = argparse.ArgumentParser(description='示例程序')
parser.add_argument('src', help='源文件路径')          # 位置参数，必填
parser.add_argument('-n', '--name', default='world')   # 可选参数
parser.add_argument('--verbose', action='store_true')  # 开关
args = parser.parse_args()
print(args.src, args.name, args.verbose)
```

运行：`python demo.py data.txt -n tom --verbose`。相比手写 `sys.argv` 解析，argparse 自动生成 `-h` 帮助、类型转换、必填校验。

### 13. logging：日志系统（替代 print 调试）

```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
log = logging.getLogger(__name__)
log.debug('调试信息')              # INFO 级别下不输出
log.info('正常流程')
log.warning('可疑但不影响运行')
log.error('出错了')
try:
    1 / 0
except Exception:
    log.exception('记录异常堆栈')   # 自动带 traceback
```

级别：`DEBUG < INFO < WARNING < ERROR < CRITICAL`。相比 `print`，logging 能**分级、带时间戳、输出到文件/网络、按模块开关**，生产代码必备。

> 重复输出坑：`basicConfig` 只在第一次生效；重复 `addHandler` 会让日志打多遍。正确做法是在模块顶层定义 logger，只在程序入口配置一次。

### 14. hashlib：哈希与加盐

```python
import hashlib
hashlib.md5(b'text').hexdigest()          # 注意传 bytes
hashlib.sha256(b'text').hexdigest()       # 更安全的摘要
```

密码存储思路（加盐，避免彩虹表）：

```python
import hashlib, os
def hash_pwd(pwd: str, salt: bytes = None) -> tuple:
    salt = salt or os.urandom(16)
    h = hashlib.pbkdf2_hmac('sha256', pwd.encode(), salt, 100000)
    return salt, h
```

不要用 md5/sha 直接存明文密码，要加盐并用 `pbkdf2_hmac` 这类慢哈希。校验时重新计算比较（用 `hmac.compare_digest` 防时序攻击）。

### 15. enum：枚举

```python
from enum import Enum, auto, unique

class Color(Enum):
    RED = 1
    GREEN = auto()             # 自动赋值 2
    BLUE = auto()              # 3

Color.RED.value                  # => 1
Color(1)                         # => Color.RED（按值取成员）

@unique                          # 约束值唯一，重复值会抛 ValueError
class Status(Enum):
    OK = 1
    FAIL = 2
```

也支持 Functional API：`Color = Enum('Color', ['RED', 'GREEN', 'BLUE'])`。枚举比裸常量更安全（类型校验、不可被误改）。

### 16. typing：类型注解

```python
from typing import List, Dict, Optional, Union, Any, Callable, Tuple

def f(x: int, items: List[str]) -> Optional[str]:
    return items[0] if items else None

def g(a: Union[int, str]) -> Any: ...
def h(cb: Callable[[int], int]) -> int: ...
```

Python 3.9+ 推荐直接用内置泛型：`list[str]`、`dict[str, int]`、`tuple[int, str]`、`X | None`（3.10+ 替代 `Optional`）。类型注解**运行时不做检查**，需 `mypy`/`pyright` 静态分析；但能显著提升可读性与 IDE 提示。

### 17. subprocess：执行外部命令

```python
import subprocess
r = subprocess.run(['ls', '-l'], capture_output=True, text=True)
r.returncode                       # => 0 表示成功
r.stdout                           # => 命令标准输出
r.stderr                           # => 错误输出
```

优先用 `run`（不要再用已废弃的 `os.system`/`popen`）。`shell=True` 有命令注入风险，除非必要否则不用；要传列表参数而非拼接字符串。

### 18. glob：文件通配

```python
import glob
glob.glob('*.py')                       # 当前目录 .py
glob.glob('**/*.py', recursive=True)    # 递归匹配所有子目录
```

需要 `Path` 对象时用 `pathlib.Path(...).glob/rglob`（上文已讲），二者等价，按需选。

### 19. contextlib：上下文管理工具

```python
from contextlib import suppress, closing, contextmanager

with suppress(FileNotFoundError):       # 忽略指定异常，等价于 try/except pass
    os.remove('tmp.txt')

@contextmanager
def timer():
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f'耗时 {time.perf_counter() - start:.3f}s')

with timer():
    ...  # 自动计时
```

`suppress` 简化"忽略某些异常"；`@contextmanager` 用生成器快速写上下文管理器（详见第 8 章）。

### 20. re 模块定位

正则 `re` 用于模式匹配（详见第 5 章），这里仅定位：常用 `re.match`/`re.search`/`re.findall`/`re.sub`/`re.compile`。处理文本解析、校验时高频出现。

---

## 二、常用方法速查表

| 模块 | 高频方法 / 类 | 用途 | 备注 |
| --- | --- | --- | --- |
| `os` | `getcwd` `listdir` `mkdir` `makedirs` `remove` `rename` `environ` | 操作系统交互 | 路径建议用 pathlib |
| `pathlib` | `Path` `/` `exists` `is_file` `iterdir` `read_text` `write_text` `glob` `resolve` | 面向对象路径 | 新代码首选 |
| `sys` | `argv` `exit` `stdout` `stderr` `path` `modules` `getsizeof` | 解释器环境 | 看对象内存用 getsizeof |
| `time` | `time` `sleep` `perf_counter` `localtime` | 时间戳/计时 | 测性能用 perf_counter |
| `datetime` | `date` `time` `datetime` `timedelta` `strftime` `strptime` | 日期时间 | naive/aware 勿混用 |
| `json` | `dumps` `loads` `dump` `load` | 跨语言序列化 | `ensure_ascii=False` 出中文 |
| `pickle` | `dumps` `loads` `dump` `load` | 任意对象序列化 | 不可信数据禁用 |
| `random` | `random` `randint` `choice` `shuffle` `sample` `seed` | 伪随机 | 安全用 secrets |
| `math` | `isclose` `ceil` `floor` `comb` `perm` `gcd` | 数学运算 | 浮点比较用 isclose |
| `decimal` | `Decimal` `getcontext` | 精确小数 | 金融场景 |
| `collections` | `Counter` `defaultdict` `deque` `namedtuple` `ChainMap` | 增强容器 | 词频/分组/双端 |
| `itertools` | `count` `cycle` `repeat` `chain` `islice` `product` `permutations` `combinations` `groupby` | 迭代工具 | groupby 先排序 |
| `functools` | `lru_cache` `partial` `reduce` `wraps` | 函数式 | lru_cache 缓存加速 |
| `argparse` | `ArgumentParser` `add_argument` `parse_args` | 命令行参数 | 自动生成 -h |
| `logging` | `basicConfig` `getLogger` `debug/info/warning/error` | 日志 | 替代 print |
| `hashlib` | `md5` `sha256` `pbkdf2_hmac` | 哈希 | 密码加盐慢哈希 |
| `enum` | `Enum` `auto` `@unique` | 枚举 | 值唯一约束 |
| `typing` | `List` `Dict` `Optional` `Union` `Callable` | 类型注解 | 3.9+ 用内置泛型 |
| `subprocess` | `run` `capture_output` | 执行命令 | 别用 os.system |
| `glob` | `glob` `iglob` | 文件通配 | recursive 递归 |
| `contextlib` | `suppress` `closing` `contextmanager` | 上下文管理 | 简化写法 |

---

## 三、高频面试题（附答案）

**Q1：`json.dumps` 输出中文变成 `\uXXXX` 怎么办？**

加 `ensure_ascii=False`。默认 `True` 是为了兼容纯 ASCII 环境。

**Q2：json 和 pickle 的区别？**

json 是跨语言文本格式，安全但只支持基础类型；pickle 是 Python 专有二进制协议，能序列化几乎任意对象，但**反序列化不可信数据会执行任意代码（RCE），有严重安全风险**，只用于本地可信数据。

**Q3：`os.path` 和 `pathlib` 该用哪个？**

新代码用 `pathlib`：路径是对象，可用 `/` 拼接，自带读写文本、`glob` 等方法，代码更短更不易出错。`os.path` 仍有存量代码在用，二者可共存。

**Q4：`time` 和 `datetime` 的区别？**

`time` 偏底层，主要处理时间戳和与 C 库交互；`datetime` 提供日期时间对象，支持加减、比较、时区、格式化，业务开发以 `datetime` 为主。

**Q5：时间戳和日期字符串怎么互转？**

`datetime.strptime(s, fmt)` 字符串 -> datetime；`dt.strftime(fmt)` datetime -> 字符串；`dt.timestamp()` / `datetime.fromtimestamp(ts)` 与时间戳互转。

**Q6：为什么生产代码用 logging 而不是 print？**

print 无法分级、无法关闭、没有时间戳和模块信息、只能输出到 stdout。logging 支持级别控制、格式化、多输出目标（文件/网络/轮转），且能通过配置统一开关。

**Q7：`collections` 模块你常用哪些？分别解决什么问题？**

`Counter` 词频统计与 TopN；`defaultdict` 分组聚合、免 setdefault 判断；`deque` 队列/栈/滑动窗口（两端 O(1)）；`namedtuple` 轻量数据载体；`ChainMap` 多配置合并。

**Q8：`groupby` 有什么坑？**

它只对相邻的相同 key 分组，必须先按同一个 key 排序，否则同一 key 的数据会分散到多组，看起来像"随机分组"。

**Q9：`functools.lru_cache` 的原理和注意事项？**

用哈希表缓存「参数 -> 返回值」，命中直接返回，把指数级递归变线性。注意：参数必须可哈希；被缓存函数应是纯函数；`maxsize=None` 不限大小，可用 `cache_clear()` 清理。

**Q10：`random` 模块生成的随机数安全吗？**

不安全，是伪随机（梅森旋转，给定种子可复现）。生成令牌、验证码、密码请用 `secrets` 模块。

**Q11：`if __name__ == '__main__':` 的作用？**

被直接运行时该模块 `__name__` 是 `'__main__'`，被 import 时是模块名。用它包裹"只在直接运行时执行"的代码（如 `multiprocessing` 启动），避免 import 产生副作用。

**Q12：如何递归遍历目录下所有 `.py` 文件？**

```python
from pathlib import Path
for p in Path('.').rglob('*.py'):
    print(p)
```

**Q13：`decimal` 为什么比 float 适合金融计算？**

float 是二进制浮点，有精度误差（`0.1+0.2 != 0.3`）；`Decimal` 按十进制精确存储，可设定精度，适合金额等对精度敏感的场景。

**Q14：`typing` 注解运行时生效吗？**

不生效，Python 是动态语言，注解仅作为提示，需 mypy/pyright 静态检查。但能提升可读性和 IDE 提示。

**Q15：如何用 `subprocess` 安全地执行命令？**

用 `subprocess.run(['ls', '-l'], capture_output=True, text=True)`，传参数列表而非拼接字符串；避免 `shell=True`，防止命令注入。

**Q16：密码用什么方式存储才安全？**

不要明文，也不要直接 md5/sha；用加盐的慢哈希（如 `hashlib.pbkdf2_hmac('sha256', pwd, salt, 100000)`），校验时用 `hmac.compare_digest` 防时序攻击。

---

## 四、易错点

1. **`os.path.exists` 之后立刻操作文件有竞态**：判断与操作之间文件可能被删，直接 `try/except` 更可靠（EAFP 风格）
2. **naive 与 aware datetime 混用**：比较/相减会抛 `TypeError`，时区统一处理
3. **`random.sample` 的 k 不能大于序列长度**，而 `choices`（可重复）允许
4. **`groupby` 忘记先排序**：结果看起来"随机分组"
5. **logging 重复输出**：`basicConfig` 只生效一次，重复 `addHandler` 会导致日志打多遍
6. **hashlib 传入 str**：必须 `s.encode('utf-8')` 转成 bytes
7. **`shutil.rmtree` 不可逆**：删除前先确认路径，别拼接用户输入
8. **pickle 反序列化不可信数据**：等于 RCE，绝不接收外部输入
9. **`decimal` 与 float 混运算**：先统一转 `Decimal`，否则精度优势丢失
10. **`lru_cache` 缓存可变/不可哈希参数**：参数必须可哈希，否则报错；被缓存函数应是纯函数
11. **`sys.getsizeof` 只看容器头部**：不递归计算内容字节，估算大对象要小心
12. **`pathlib` 与 `os.path` 混用时路径类型不一致**：统一用一种风格，避免 `str` 与 `Path` 来回转
