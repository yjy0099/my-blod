---
title: Python 基础笔记 · 第 9 章：多线程与多进程
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 并发编程, GIL, 多线程, 多进程]
summary: GIL 到底限制了什么、threading 与锁的正确用法、RLock/Semaphore/Event 的适用场景、multiprocessing 与进程池、concurrent.futures 统一接口，售票系统从超卖到加锁到 Queue 的完整实战，以及 CPU 密集与 IO 密集的并发选型决策，附 21 道高频面试题。
---

## 一、核心知识点

并发编程是面试重灾区。核心要回答两个问题：**什么时候该用并发**（CPU 密集 vs IO 密集），以及**用哪种并发原语**（线程/进程/协程）。一切结论都绕不开 GIL。

### 1. 并发 vs 并行，进程 vs 线程 vs 协程

| 概念 | 说明 | 切换开销 | 能否利用多核 |
| --- | --- | --- | --- |
| **进程** | 操作系统资源分配最小单位，内存隔离 | 大 | 能 |
| **线程** | CPU 调度最小单位，共享进程内存 | 中 | 受 GIL 限制 |
| **协程** | 用户态轻量级"线程"，程序自己调度 | 极小 | 否（单线程内并发） |

- **并发（concurrency）**：交替执行，看起来同时（单核也能并发）
- **并行（parallelism）**：真的同时跑在多核上

### 2. GIL 全局解释器锁

**GIL（Global Interpreter Lock）** 是 CPython 的互斥锁：**同一时刻只允许一个线程执行 Python 字节码**。

- 存在理由：简化 CPython 内存管理（引用计数的线程安全）、保证 C 扩展兼容性
- 实际影响：
  - **IO 密集型**（网络请求、文件读写）：线程等待 IO 时**释放 GIL**，多线程有效
  - **CPU 密集型**（计算、图像处理）：多线程无法利用多核，甚至因切换更慢
- 绕过方式：多进程（每进程独立 GIL）、C 扩展（NumPy 底层释放 GIL）、asyncio（单线程协程）；Python 3.13+ 提供实验性 free-threading（PEP 703）关闭 GIL

### 3. 选型结论

**CPU 密集用多进程，IO 密集用多线程/协程。**

- CPU 密集：计算占主导，多线程被 GIL 串行化，必须用多进程真正并行
- IO 密集：线程大量时间在等网络/磁盘，GIL 早已释放，多线程/协程就能大幅缩短总耗时，且共享内存写起来简单

### 4. threading 基础

```python
import threading

def worker(name, n):
    print(f'{name} 处理 {n}')

t = threading.Thread(target=worker, args=('A', 1), daemon=True)
t.start()
t.join()              # 等待线程结束；不 join 主线程结束会直接退出
print(threading.active_count())        # => 当前线程数
print(threading.current_thread().name) # => 当前线程名
```

- `daemon=True`：守护线程，主线程退出时被强制结束，适合心跳/后台任务
- 线程间共享内存，通信简单，但必须处理同步

### 5. 线程安全与竞态条件

```python
import threading
counter = 0
def inc():
    global counter
    for _ in range(100000):
        counter += 1          # ❌ 非原子：读-改-写三步，多线程下丢失更新

ts = [threading.Thread(target=inc) for _ in range(2)]
[t.start() for t in ts]; [t.join() for t in ts]
print(counter)        # => 可能远小于 200000
```

`i += 1` 编译成"读取 -> 加一 -> 写回"三步字节码，线程可在任意步被打断，导致更新丢失。单条字节码操作（如 `lst.append`）是原子的（受 GIL 保护）。

### 6. 锁机制

```python
lock = threading.Lock()
counter = 0
def inc():
    global counter
    for _ in range(100000):
        with lock:            # 推荐：自动释放，异常时也安全
            counter += 1
```

| 同步原语 | 用途 |
| --- | --- |
| `Lock` | 基本互斥锁（不可重入） |
| `RLock` | 可重入锁，同一线程可多次 acquire |
| `Semaphore(n)` | 信号量，限制同时访问的线程数 |
| `Event` | 线程间事件通知（`set`/`wait`/`clear`） |
| `Condition` | 条件变量，等待-通知（生产者消费者） |
| `queue.Queue` | 线程安全队列，首选的线程通信方式 |

```python
ev = threading.Event()
# 等待方
ev.wait(timeout=5)     # 阻塞直到 ev.set()
# 通知方
ev.set()               # 唤醒所有 wait
```

`RLock` 用于同一线程递归调用需重复加锁的场景；`Semaphore` 常用于连接池限流。

### 7. 死锁

四个必要条件：互斥、占有且等待、不可抢占、循环等待。

```python
# 死锁示例：两线程以相反顺序加锁
def deadlock():
    with lock_a:
        with lock_b:     # 若另一线程先拿 lock_b 再等 lock_a，互相等待
            ...
```

避免：**按固定顺序获取锁**、`with` 自动释放、`acquire(timeout=)` 加超时、减少锁嵌套。

### 8. threading.local 线程局部数据

```python
import threading
local = threading.local()
def worker():
    local.user = threading.current_thread().name   # 每个线程独立一份
    print(local.user)
```

`threading.local` 让每个线程拥有变量独立副本，避免共享状态污染（如 Web 框架存"当前请求用户"）。

### 9. queue.Queue 生产者消费者

```python
from queue import Queue
import threading

q = Queue(maxsize=100)
def producer():
    for i in range(10):
        q.put(i)
def consumer():
    while True:
        item = q.get()
        print('处理', item)
        q.task_done()        # 标记完成

ts = [threading.Thread(target=consumer, daemon=True) for _ in range(3)]
[p.start() for p in ts]
producer()
q.join()                     # 等待所有任务处理完
```

`Queue` 内部已加锁，是线程间传递数据的首选，比手动加锁更安全清晰。

### 10. multiprocessing 多进程

```python
from multiprocessing import Process
import os

def worker(n):
    print(f'子进程 {os.getpid()} 处理 {n}')

if __name__ == '__main__':            # ⚠️ Windows/macOS 必须加这行
    ps = [Process(target=worker, args=(i,)) for i in range(4)]
    [p.start() for p in ps]
    [p.join() for p in ps]
```

**为什么必须 `if __name__ == '__main__'`？** Windows 用 `spawn` 启动子进程——子进程会 import 主模块重建上下文。没有这行保护，import 又执行创建进程的代码，无限递归创建子进程。

### 11. 进程池 Pool

```python
from multiprocessing import Pool

def heavy(x):
    return x * x

if __name__ == '__main__':
    with Pool(processes=4) as pool:
        print(pool.map(heavy, range(10)))          # 阻塞，按序返回
        for r in pool.imap_unordered(heavy, range(10)):
            print(r)                                # 谁先完成先返回
```

### 12. 进程间通信

进程间**内存不隔离问题不存在——它们本就隔离**，全局变量互不可见，传参需可 pickle 序列化。

```python
from multiprocessing import Queue, Value, Array, Manager

q = Queue()                 # 消息传递（首选）
shared = Value('i', 0)      # 共享内存（带锁），'i'=int
arr = Array('d', [1.0, 2.0]) # 共享数组
mgr = Manager()
d = mgr.dict()              # 代理 dict，跨进程共享（性能较低）
```

- `Queue`/`Pipe`：消息传递，首选
- `Value`/`Array`：共享内存，带锁
- `Manager`：代理对象（dict/list），跨进程共享，性能低

### 13. concurrent.futures 统一高层接口

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=8) as ex:
    futures = [ex.submit(pow, 2, i) for i in range(5)]
    for fu in as_completed(futures):     # 谁先完成先处理
        print(fu.result())

with ProcessPoolExecutor() as ex:
    for r in ex.map(pow, [2]*5, range(5)):   # 按输入顺序拿结果
        print(r)
```

`submit()` 返回 `Future`，可用 `result(timeout=)`、`exception()`、`add_done_callback()`、`cancel()`。相比手动管理，Executor 提供池化复用、统一异常传播、自动回收，新代码优先用。

### 14. asyncio 简介

```python
import asyncio

async def fetch(url):
    print('请求', url)
    await asyncio.sleep(1)      # await 处让出控制权，事件循环去跑别的协程
    return 'done'

async def main():
    results = await asyncio.gather(*[fetch(u) for u in ['a', 'b', 'c']])
    return results

asyncio.run(main())
```

- 单线程内并发，**无线程切换开销**，可支撑上万连接
- 但**一个阻塞调用（如 `time.sleep`、`requests`）会卡死整个事件循环**，必须用 `asyncio.sleep` 与 `aiohttp`
- 适合高并发网络 IO（爬虫、网关）；不适合 CPU 密集、同步库无法改造的场景

### 15. 选型决策与池大小

```text
任务是 CPU 密集？（大量计算、图像处理、加密解密）
├── 是 → 多进程（ProcessPoolExecutor / multiprocessing）
└── 否 → IO 密集？（网络请求、文件读写、数据库查询）
    ├── 并发量极大（上千连接）→ 协程 asyncio
    └── 一般规模 → 多线程（ThreadPoolExecutor）
```

池大小经验值（IO 等待越久，线程数可越大）：

```python
import os
CPU_COUNT = os.cpu_count()
# CPU 密集：核数（多给只增切换开销）
# IO 密集：核数 × (1 + IO等待时间 / CPU计算时间)，常见 2~4 倍起步
```

### 16. 实战：售票系统（超卖 → 加锁 → 用 Queue）

这个案例把「竞态条件」演一遍，是理解锁最直观的例子。

**版本一：不加锁 → 超卖**

```python
import threading
import time

TICKETS = 10

def sell_unsafe(seller):
    """先检查后扣减，两步之间可能被线程切换打断。"""
    global TICKETS
    while TICKETS > 0:
        if TICKETS > 0:
            time.sleep(0.001)        # 模拟查询余票的耗时，主动让出执行权
            TICKETS -= 1             # 检查与扣减不是一个原子操作 → 超卖
            print(f'{seller} 卖出 1 张，余票 {TICKETS}')

threads = [threading.Thread(target=sell_unsafe, args=(f'窗口{i}',)) for i in range(1, 4)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print('最终余票:', TICKETS)          # 可能为负数！
```

根因：`if TICKETS > 0` 和 `TICKETS -= 1` 之间存在**窗口期**，多个线程可能同时通过检查，于是卖出超过 10 张。

**版本二：加锁 → 检查与扣减变成原子操作**

```python
import threading
import time

TICKETS = 10
lock = threading.Lock()

def sell_safe(seller):
    global TICKETS
    while True:
        with lock:                       # 临界区：同一时刻只有一个线程能进
            if TICKETS <= 0:
                break
            time.sleep(0.001)
            TICKETS -= 1
            left = TICKETS
        print(f'{seller} 卖出 1 张，余票 {left}')

threads = [threading.Thread(target=sell_safe, args=(f'窗口{i}',)) for i in range(1, 4)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print('最终余票:', TICKETS)              # 恒为 0，不会超卖
```

要点：锁要**包住「检查 + 修改」这一整段**，只锁扣减那一行是没用的；`with lock` 保证异常时也会释放，比手写 `acquire/release` 安全。

**版本三：用 `queue.Queue` 把票变成任务**

`Queue` 的 `get()` 是**线程安全**的，一张票只能被一个 worker 取走，天然不会重复。

```python
import queue
import threading

tickets = queue.Queue()
for i in range(1, 11):
    tickets.put(i)                       # 10 张票 = 10 个任务

sold = []                                # CPython 里 list.append 是原子的，可放心用

def worker(name):
    while True:
        try:
            ticket = tickets.get_nowait()    # 拿走即出队，其他线程拿不到同一张
        except queue.Empty:
            return
        sold.append((name, ticket))

threads = [threading.Thread(target=worker, args=(f'窗口{c}',)) for c in 'ABC']
for t in threads:
    t.start()
for t in threads:
    t.join()

print('共售出:', len(sold), '张')          # 恒为 10
```

**三种写法的选择：**

| 场景 | 推荐做法 |
| --- | --- |
| 共享一个计数器/余额 | `Lock` 包住「检查 + 修改」 |
| 任务分发给多个消费者 | `queue.Queue`（天然线程安全，无需自己加锁） |
| CPU 密集的抢票计算 | `multiprocessing` + `Queue`，绕过 GIL |

> 真实系统还会把「扣库存」下沉到数据库，用 `update stock = stock - 1 where stock > 0` 的原子 SQL 或分布式锁来保证，而不是靠进程内的 `Lock`——因为服务是多机部署的。

---

## 二、常用方法速查表

| 模块/类 | 高频方法 | 用途 | 备注 |
| --- | --- | --- | --- |
| `threading.Thread` | `start` `join` `daemon` | 创建线程 | 共享内存 |
| `threading.Lock` | `acquire` `release`（`with`） | 互斥锁 | 不可重入 |
| `threading.RLock` | `acquire` `release` | 可重入锁 | 同线程可重复 |
| `threading.Semaphore` | `acquire` `release` | 限流 | 限制并发数 |
| `threading.Event` | `set` `wait` `clear` | 事件通知 | 标志同步 |
| `threading.Condition` | `wait` `notify` | 条件变量 | 等待-通知 |
| `threading.local` | 属性赋值 | 线程局部数据 | 每线程独立 |
| `queue.Queue` | `put` `get` `task_done` `join` | 线程安全队列 | 首选通信 |
| `multiprocessing.Process` | `start` `join` `daemon` | 创建进程 | 需 `__main__` |
| `multiprocessing.Pool` | `map` `apply_async` `imap_unordered` | 进程池 | CPU 密集 |
| `multiprocessing.Queue` | `put` `get` | 进程通信 | 可 pickle |
| `concurrent.futures` | `ThreadPoolExecutor` `ProcessPoolExecutor` `submit` `map` `as_completed` | 统一接口 | 优先用 |
| `asyncio` | `run` `gather` `await` `sleep` | 协程 | 单线程并发 IO |

---

## 三、高频面试题（附答案）

**Q1：什么是 GIL？它有什么影响？**

GIL 是 CPython 的全局解释器锁，保证同一时刻只有一个线程执行字节码。它简化了内存管理，但导致多线程无法利用多核做 CPU 密集计算。IO 密集场景不受影响（等待 IO 会释放 GIL）。

**Q2：多线程和多进程怎么选？**

CPU 密集用多进程（真正并行、绕过 GIL）；IO 密集用多线程或协程（开销小、共享内存方便）。进程内存隔离、通信成本高但稳定；线程共享内存、通信方便但易出并发 bug。

**Q3：Python 里如何实现线程同步？**

`Lock`/`RLock` 互斥、`Semaphore` 限流、`Event` 通知、`Condition` 条件等待，最推荐用 `queue.Queue`（内部已加锁）传递数据，减少显式锁。

**Q4：什么是死锁？怎么避免？**

多个线程互相持有对方需要的锁而永久阻塞。四条件：互斥、占有且等待、不可抢占、循环等待。避免：按固定顺序加锁、`with` 自动释放、加超时、减少锁嵌套。

**Q5：`i += 1` 在多线程下安全吗？**

不安全。编译成"读-加-写"三步字节码，线程可在任意步被打断导致更新丢失。需加锁，或用 `itertools.count`、`queue` 等线程安全结构。

**Q6：为什么 Windows 下 multiprocessing 必须写 `if __name__ == '__main__'`？**

Windows 用 `spawn` 创建子进程，子进程会重新 import 主模块。没有保护的话 import 又执行创建进程的代码，无限递归创建子进程。

**Q7：进程间如何通信？**

`Queue`/`Pipe`（消息传递，推荐）、`Value`/`Array`（共享内存）、`Manager`（代理对象）。传的数据必须可 pickle 序列化。

**Q8：`daemon=True` 是什么意思？**

设为守护线程/进程，主程序退出时它被直接终止，不阻止程序退出。适合心跳、监控这类"随主程序生死"的后台任务。

**Q9：协程和线程的区别？**

协程在用户态由程序自己调度，切换成本极低（无内核态切换），单线程内实现高并发；线程由操作系统调度，有上下文切换开销。协程适合高并发 IO，但一个阻塞调用会卡住整个事件循环。

**Q10：线程池大小怎么定？**

CPU 密集设为核数；IO 密集可设 `核数 × (1 + IO等待时间/计算时间)`，实践常用 2~4 倍核数起步，依压测调整。

**Q11：多线程下 `list.append` 安全吗？**

安全。单条字节码操作受 GIL 保护，是原子的。但 `lst[i] += 1`、`d[k] = d.get(k,0)+1` 这类复合操作不是原子。

**Q12：既然有 GIL，多线程是不是就没用了？**

不是。IO 密集场景（爬虫、API、批量文件处理）线程等待时释放 GIL，多线程能显著缩短总耗时；且共享内存写起来比多进程简单。

**Q13：`concurrent.futures` 相比手动管理线程/进程好在哪？**

提供池化复用、统一的异常传播、自动资源回收，API 一致（线程池/进程池只换类名），新代码优先用。

**Q14：为什么协程里不能用 `requests`/`time.sleep`？**

它们是同步阻塞调用，会卡死整个事件循环，使其他协程都无法运行。应改用 `aiohttp`、`asyncio.sleep` 等异步版本。

**Q15：`Future` 是什么？**

`submit` 返回的占位对象，代表"将来完成的任务"。可用 `result(timeout=)` 取结果、`exception()` 查异常、`add_done_callback()` 注册回调、`cancel()` 取消（未开始的任务）。

**Q16：什么是竞态条件（race condition）？举一个例子。**

多个线程/进程**以不可预期的顺序访问共享资源**，导致结果依赖执行时序、不可复现，这就是竞态条件。最典型的是「先检查后使用」：

```python
if TICKETS > 0:        # 线程 A、B 可能同时通过检查
    TICKETS -= 1       # 于是卖出超过库存 → 超卖
```

因为「检查」和「修改」不是原子操作，中间可能被切换。解决办法是**互斥**：用 `Lock` 把这段临界区保护起来，或改用线程安全的 `queue.Queue`。

**Q17：`Lock` 和 `RLock` 有什么区别？什么时候必须用 `RLock`？**

- `Lock`（互斥锁）：**不可重入**，同一线程第二次 `acquire` 会**永久阻塞**自己（自锁）；
- `RLock`（可重入锁）：内部记录持有者与重入次数，同一线程可多次 `acquire`，相应地也要 `release` 同样次数才真正释放。

必须用 `RLock` 的场景：**同一个线程内会递归进入临界区**——例如类的公开方法加了锁，内部又调用另一个也加同一把锁的方法。

```python
import threading

rlock = threading.RLock()

def outer():
    with rlock:
        inner()

def inner():
    with rlock:          # 用普通 Lock 这里会死锁
        print('ok')
```

**Q18：`Semaphore` 和 `Lock` 有什么区别？**

`Lock` 是**二元**的（同一时刻只允许 1 个）；`Semaphore` 是**计数**信号量，允许「最多 N 个」同时进入，用于**限流**（如限制并发请求数、限制连接池大小）。

```python
import threading

sem = threading.Semaphore(3)      # 最多 3 个并发

def task(i):
    with sem:
        print(f'任务 {i} 执行中')
```

耗尽了就阻塞，释放一个才能进下一个。还有个有用的变体 `BoundedSemaphore`，释放次数超过初值会报错，能及早发现 `release` 写多了的 bug。

**Q19：`threading.Event` 有什么用？**

它是一面**线程间的信号旗**：`set()` 置为真、`clear()` 置为假、`wait(timeout)` 阻塞直到被置真。典型场景是**一个线程等另一个线程发出「可以开始了」的信号**，比如主线程等初始化完成、或通知所有 worker 停止。

```python
import threading

start_event = threading.Event()

def worker():
    start_event.wait()          # 一直等到信号
    print('开始干活')

t = threading.Thread(target=worker)
t.start()

# 主线程准备好后
start_event.set()               # 唤醒所有等待者
t.join()
```

**Q20：为什么 `queue.Queue` 不用自己加锁？**

因为它**内部已经用锁和条件变量实现了线程安全**：`put`/`get` 是原子操作，并且支持 `task_done()` / `join()` 等待全部完成。多个消费者可以放心并发 `get()`，**同一张票不会被取两次**。

```python
import queue

q = queue.Queue()
q.put('票1')          # 生产者
item = q.get()        # 消费者（阻塞直到有数据）
```

所以「任务分发给多个消费者」的场景应优先用 `Queue`，而不是「共享列表 + 自己加锁」——前者更简单也更不容易写错。注意 `queue` 之外，`LifoQueue`（栈）、`PriorityQueue`（优先级）同样是线程安全的。

**Q21：线程池相比手动 `Thread` 有什么优势？**

- **复用线程**：省去频繁创建/销毁线程的开销；
- **限定并发数**：避免无限制建线程把系统拖垮；
- **统一获取结果与异常**：`submit` 返回 `Future`，可用 `as_completed` / `map` 优雅收集；
- **代码更短**：不用手动维护线程列表、`join` 和结果容器。

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=4) as pool:
    futures = [pool.submit(fetch, url) for url in urls]
    for f in as_completed(futures):
        print(f.result())
```

> 记住：**进程池**用 `ProcessPoolExecutor`（绕 GIL，适合 CPU 密集），**线程池**用 `ThreadPoolExecutor`（适合 IO 密集）。

---

## 四、易错点

1. **忘了 `if __name__ == '__main__'`**：Windows 上无限创建子进程，CPU 打满
2. **在协程里用阻塞库**：`time.sleep`/`requests` 卡死整个事件循环，要用 `asyncio.sleep`/`aiohttp`
3. **线程池里传不可 pickle 的对象**：多进程下 lambda、嵌套函数、文件句柄都无法序列化
4. **用全局变量在进程间共享状态**：进程内存独立，改了互不可见，要用 `Queue` 或 `Manager`
5. **锁粒度过大**：把整段业务逻辑都锁住，并发退化为串行，只锁真正需要保护的临界区
6. **忘记 `join()`**：主程序提前退出，子线程/进程被干掉，任务只跑了一半
7. **CPU 密集用多线程期望提速**：受 GIL 限制，反而可能更慢，请改用多进程
8. **`counter += 1` 不加锁**：竞态丢失更新，结果偏小
9. **死锁**：两线程以相反顺序加锁，务必按固定顺序获取
10. **`Queue` 忘记 `task_done`/`join`**：无法正确等待任务全部完成
11. **滥用 `daemon=True`**：关键任务设成守护线程，主程序退出时任务被腰斩
12. **进程间传 lambda**：`multiprocessing` 需 pickle，`lambda` 不可序列化，抛 `PicklingError`
13. **只锁住「扣减」那一行**：检查和修改必须一起包进临界区，否则照样超卖
14. **用普通 `Lock` 写递归临界区**：同一线程二次 `acquire` 会自锁，应改用 `RLock`
15. **`Semaphore` 忘记释放**：`acquire` 后没用 `with` 或漏 `release`，配额会被永久占掉
16. **`Event.wait()` 不设超时**：发信号的线程若死在路上，等待线程会永远挂起
