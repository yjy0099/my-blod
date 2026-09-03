---
title: Python 基础笔记 · 第 8 章：异常处理
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 异常处理, 上下文管理器]
summary: 异常层级结构、try/except/else/finally 的执行顺序与 finally 里的 return 陷阱、异常链 raise from、自定义异常，以及 with 上下文管理器的实现原理与最佳实践。
---

## 一、核心知识点

异常不是"错误发生就崩溃"，而是一套完整的**控制流机制**：错误被包装成对象，在调用栈中向上传播，直到被捕获处理。理解它，才能写出健壮、可维护的程序。

### 1. 异常的本质：错误也是对象

在 Python 中，异常是继承自 `BaseException` 的类的实例。当出错时解释器创建该实例并**中断当前正常控制流**，沿调用栈向上寻找能处理它的 `except`。若没有捕获，程序打印 traceback 后退出。

```python
try:
    1 / 0
except ZeroDivisionError as e:
    print(type(e).__name__, e)    # => ZeroDivisionError division by zero
```

### 2. 异常体系层级

```text
BaseException
├── SystemExit          # sys.exit() 触发
├── KeyboardInterrupt   # Ctrl+C
├── GeneratorExit       # 生成器被关闭
└── Exception           # ← 业务代码几乎只跟它打交道
    ├── ArithmeticError   └── ZeroDivisionError
    ├── LookupError       ├── KeyError      （dict 键不存在）
    │                     └── IndexError    （下标越界）
    ├── TypeError         （类型不对）
    ├── ValueError        （值不对）
    ├── AttributeError    （属性不存在）
    ├── NameError         （名字未定义）
    ├── OSError           ├── FileNotFoundError
    │                     └── PermissionError
    ├── ImportError / ModuleNotFoundError
    ├── StopIteration     （迭代器耗尽）
    ├── AssertionError    （assert 失败）
    └── RuntimeError
```

> `except Exception` **抓不到** `KeyboardInterrupt` 和 `SystemExit`——这是故意设计的，否则程序无法被 Ctrl+C 终止。

### 3. 常见触发场景

| 异常 | 触发场景 | 示例 |
| --- | --- | --- |
| `ValueError` | 值合法但类型对、内容不对 | `int('abc')` |
| `TypeError` | 类型不支持该操作 | `1 + 'a'` |
| `KeyError` | dict 键不存在 | `d['missing']` |
| `IndexError` | 下标越界 | `lst[99]` |
| `AttributeError` | 访问不存在的属性 | `obj.xxx` |
| `NameError` | 变量未定义 | `print(undefined)` |
| `ZeroDivisionError` | 除零 | `1 / 0` |
| `FileNotFoundError` | 文件不存在 | `open('nope.txt')` |
| `StopIteration` | 迭代器耗尽 | 手写过 `next(it)` |

### 4. try/except 捕获：顺序与绑定

```python
try:
    risky()
except ValueError as e:          # 1. 有匹配异常 -> 执行
    print('值错误', e)
except (TypeError, KeyError):    # 多个异常用元组
    print('类型或键错误')
except Exception as e:           # 兜底放最后（子类在前，父类在后）
    log.exception(e)
    raise                       # 记录后原样抛出
```

- 可写多个 `except`，**捕捉顺序从具体到宽泛**：越具体的越靠前，否则宽泛的会"截胡"后面具体的分支
- `as e` 把异常对象绑定到变量，可读取 `.args`、`.__cause__` 等信息

### 5. else 与 finally 子句

```python
try:
    value = d['key']
except KeyError:
    value = default
else:
    print('没有异常时才执行')     # 成功分支，与 try 分离
finally:
    cleanup()                     # 永远执行：关文件、关连接、解锁
```

- `else`：try 块**没有异常**时执行，把"成功后的逻辑"与可能出错的逻辑分离，避免被 except 误捕
- `finally`：**无论是否异常、是否 return 都执行**，用于释放资源

| 子句 | 执行时机 | 典型用途 |
| --- | --- | --- |
| `try` | 被监控的代码 | 可能出错的操作 |
| `except` | 捕获到匹配异常 | 补救、转换、记录 |
| `else` | 没有发生异常 | 成功后的逻辑 |
| `finally` | 永远执行 | 释放资源 |

### 6. finally 里的 return 陷阱（经典面试题）

```python
def f():
    try:
        return 1
    finally:
        return 2          # ❌ 覆盖前面的返回值，且吞掉未处理异常

f()                       # => 2
```

`finally` 在 `return` 之前执行，里面的 `return 2` 会**覆盖** `try` 里的 `return 1`，并且如果 try 块抛了未处理异常，也会被 `finally` 的 `return` 静默吞掉，让 bug 极难排查。**永远不要在 `finally` 里写 `return` 或 `raise`**。

### 7. raise 主动抛出与异常链

```python
raise ValueError('参数不合法')     # 抛出指定异常

try:
    1 / 0
except ZeroDivisionError:
    raise                       # 原样重抛，保留完整 traceback（仅能用在 except 内）

try:
    parse(data)
except ParseError as e:
    raise ConfigError('配置解析失败') from e   # 显式异常链
```

- `raise`（不带参数）只能在 `except` 块用，保留原始堆栈
- `raise X from Y` 设置 `X.__cause__ = Y`，输出显示「The above exception was the direct cause」，根因一目了然
- 不写 `from` 时原异常成为 `__context__`，显示「During handling ... another exception occurred」
- `raise X from None` 可抑制上下文，让输出更干净

### 8. 自定义异常

```python
class BizError(Exception):
    """所有业务异常的基类"""
    def __init__(self, message, code=400):
        super().__init__(message)
        self.code = code

class OrderNotFoundError(BizError):
    pass

try:
    raise OrderNotFoundError('订单不存在', code=404)
except BizError as e:              # 按基类统一捕获
    print(e.code, e)                # => 404 订单不存在
```

原则：继承 `Exception`（或项目异常基类），不要继承 `BaseException`；定义异常基类方便统一捕获；异常名以 `Error` 结尾、能自解释。

### 9. with 与上下文管理器

`with` 保证离开代码块时一定执行清理逻辑，等价于 try/finally 但更简洁：

```python
with open('a.txt', encoding='utf-8') as f:
    data = f.read()        # 离开 with 自动关闭，即使中间抛异常
```

实现原理（类方式）：

```python
import time
class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self                  # 返回值绑定给 as 后的变量
    def __exit__(self, exc_type, exc_val, exc_tb):
        print(f'耗时 {time.perf_counter() - self.start:.3f}s')
        return False        # 返回 True 吞掉异常，默认 False 继续抛出
```

`__exit__` 三个参数：`exc_type`（异常类型）、`exc_val`（异常值）、`exc_tb`（traceback）。若全为 `None` 表示无异常；返回 `True` 则吞掉异常，否则继续向上抛。

### 10. @contextmanager 生成器写法

```python
from contextlib import contextmanager

@contextmanager
def timer():
    start = time.perf_counter()
    try:
        yield                  # yield 之前 = __enter__，之后 = __exit__
    finally:
        print(f'耗时 {time.perf_counter() - start:.3f}s')

with timer():
    ...
```

`yield` 产出的值会绑定给 `with ... as var`。配套工具：

```python
from contextlib import suppress, closing
with suppress(FileNotFoundError):     # 忽略指定异常
    os.remove('tmp.txt')
with closing(open('a.txt')) as f:    # 确保退出时调用 f.close()
    ...
```

### 11. assert 断言的正确边界

```python
assert x > 0, 'x 必须为正'
# 等价于
if not x > 0:
    raise AssertionError('x 必须为正')
```

> **`python -O`（优化模式）会移除所有 `assert` 语句**。所以它只能用于调试期的内部自检，**绝不能**用于参数校验、权限检查等生产逻辑——那些用 `raise ValueError` / `TypeError`。

### 12. 调试：pdb / breakpoint / logging

```python
breakpoint()          # Python 3.7+，等价于 import pdb; pdb.set_trace()
# 交互命令：n 下一步、s 进入函数、c 继续、p 变量 打印、l 看代码
```

```python
import logging, traceback
try:
    risky()
except Exception:
    logging.exception('操作失败')     # 自动附带 traceback
    # 或：print(traceback.format_exc())
```

调试优先用 `logging` 而非满屏 `print`；生产环境用 `logging.exception` 记录堆栈。

### 13. EAFP vs LBYL

```python
# LBYL（Look Before You Leap）：先判断再执行
if key in d:
    value = d[key]

# EAFP（Easier to Ask for Forgiveness than Permission）：直接干，出错再说
try:
    value = d[key]
except KeyError:
    value = default
```

Python 社区更推崇 **EAFP**：代码更短、避免竞态（判断和使用之间状态可能变化）、且在没有异常时 `try` 几乎零开销。

### 14. 异常处理最佳实践

- **别静默吞异常**：最少也要 `log.warning`，`except: pass` 是调试噩梦
- **别过宽捕获**：尽量缩小 `try` 范围，不要把整段复杂逻辑包在 `except Exception` 里
- **早抛晚捕**：在出错点尽早抛出具体异常，在能处理的高层统一捕获
- **资源用 `with`**：文件、连接、锁都用上下文管理器，避免忘记释放
- **捕获具体异常**：优先捕获 `ValueError` 这类具体异常，兜底才用 `Exception`
- **能处理就处理，处理不了就记录后抛出**：保留现场比吞掉更有价值

---

## 二、常用方法速查表

| 用法 | 语法示例 | 说明 |
| --- | --- | --- |
| 基础捕获 | `try / except E` | 捕获指定异常 |
| 多异常 | `except (E1, E2)` | 同一分支处理多个 |
| 绑定对象 | `except E as e` | 拿到异常实例 |
| 兜底 | `except Exception` | 放最后，别抓 BaseException |
| 成功分支 | `else` | 无异常时执行 |
| 清理 | `finally` | 永远执行，别写 return |
| 重抛 | `raise` | 仅 except 内，保留堆栈 |
| 异常链 | `raise E from e` | 设置 `__cause__` |
| 抑制上下文 | `raise E from None` | 输出更干净 |
| 自定义 | `class X(Error)` | 继承 Exception |
| 上下文 | `with ... as v` | `__enter__`/`__exit__` |
| 生成器 CM | `@contextmanager` | yield 切分 enter/exit |
| 忽略异常 | `suppress(E)` | 等价 try/except pass |
| 断言 | `assert cond, msg` | 仅调试，会被 -O 移除 |
| 断点 | `breakpoint()` | 交互调试 |

---

## 三、高频面试题（附答案）

**Q1：`try/except/else/finally` 的执行顺序？**

正常：`try` -> `else` -> `finally`；异常：`try`（中断）-> `except` -> `finally`。`finally` 无论如何都执行，甚至在 `return` 之后、函数真正返回之前执行。

**Q2：`finally` 里写 `return` 会怎样？**

会覆盖前面的返回值，并且吞掉未处理的异常，属于明确禁止的写法。

**Q3：`except Exception` 和裸 `except:` 的区别？**

裸 `except` 捕获包括 `KeyboardInterrupt`、`SystemExit` 在内的所有 `BaseException`，导致程序无法被 Ctrl+C 中断。应总是指定具体异常，兜底用 `except Exception`。

**Q4：为什么要 `raise ... from e`？**

保留异常链，日志中能同时看到新的包装异常和原始根因（`__cause__`），否则排查会丢失关键信息。

**Q5：`raise` 不带参数是什么意思？**

只能在 `except` 块内使用，表示原样重新抛出当前异常，完整保留原始 traceback。`log.exception(e); raise` 是标准做法。

**Q6：如何自定义异常？**

继承 `Exception`（或项目异常基类），通常定义业务异常基类 + 若干具体子类，可附带错误码字段；捕获时按基类统一处理。

**Q7：`assert` 能用于参数校验吗？**

不能。`python -O` 会移除所有 `assert`，校验会失效。参数校验请用 `raise ValueError` / `TypeError`。

**Q8：`with` 的实现原理？**

对象需实现 `__enter__()` 和 `__exit__()`。`with` 进入时调用 `__enter__`（返回值给 `as`），退出时调用 `__exit__(exc_type, exc_val, exc_tb)`；若 `__exit__` 返回 `True` 异常被吞掉，否则继续抛出。`contextlib.contextmanager` 可用生成器快速实现。

**Q9：异常会影响性能吗？**

无异常发生时，CPython 的 try 块几乎零开销（异常表跳转）；只有真正抛出并捕获异常时才较慢。所以 EAFP 在"异常罕见"场景下性能很好。

**Q10：如何记录完整的异常堆栈？**

```python
import logging
try:
    risky()
except Exception:
    logging.exception('操作失败')     # 自动附带 traceback
```

**Q11：捕获异常后应该怎么处理？**

三选一：能处理就处理（重试、降级、给默认值）；处理不了就记录后原样抛出（保留现场）；转成更高层的业务异常再抛（配合 `from e`）。最忌 `except: pass` 静默吞掉。

**Q12：`else` 子句有什么用？**

把"成功后要做的事"放在 `else` 里，避免被 `try` 块的 `except` 误捕获。如解析成功后的业务逻辑放 `else`，解析失败才走 `except`。

**Q13：`__exit__` 返回 `True` 和 `False` 的区别？**

返回 `True` 表示异常已被处理、吞掉不再向上抛；返回 `False`（或 None）表示异常继续传播。只在确实要忽略该异常时才返回 `True`。

**Q14：异常链里 `__cause__` 和 `__context__` 的区别？**

`__cause__` 由 `raise X from Y` 显式设置（根因）；`__context__` 是隐式的"在处理上一个异常时又抛出新异常"的上下文。`from None` 可清除两者。

---

## 四、易错点

1. **异常顺序写反**：`except Exception` 写在具体异常前面，导致后面分支永远进不去（父类放最后）
2. **`except: pass` 静默吞异常**：调试时完全看不到出错原因，最少也要 `log.warning`
3. **`finally` 里 `return`**：吞异常、覆盖返回值
4. **用 `assert` 做校验**：`-O` 模式下失效
5. **捕获过宽**：`except Exception` 包住整段复杂逻辑，把本该暴露的 bug 也吃掉，应尽量缩小 `try` 范围
6. **`__exit__` 返回 `True`**：除非确实要处理并忽略异常，否则异常会被无声吞掉
7. **`raise ... from` 漏写**：丢失根因，线上排查困难
8. **裸 `except:`**：连 `KeyboardInterrupt` 都抓，程序无法 Ctrl+C 退出
9. **在 `with` 块外依赖资源已释放**：误以为 `finally` 会处理，实则对象没实现上下文协议
10. **`breakpoint()` 留在生产代码**：应移除或改用 logging
