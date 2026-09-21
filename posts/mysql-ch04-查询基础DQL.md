---
title: MySQL 笔记 · 第 4 章：查询基础 DQL
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, DQL, 查询, 分组, 分页]
summary: 查询是 SQL 的核心：简单查询与心跳检测、from/where、group by 配聚合函数、having 与 where 的区别、order by 排序技巧、limit 分页公式 offset=(page-1)*rows，以及完整查询语法与 SQL 执行顺序，附 12 道高频面试题。
---

## 一、必须记住的知识点

### 1. 简单查询

```sql
select 1;               -- 心跳检测，验证连接是否正常
select now();           -- 当前日期时间
select current_date();  -- 当前日期
select user();          -- 当前登录用户
select version();       -- 数据库版本
```

> `select 1` 常被用作连接池的**心跳检测语句**，因为它开销极小且不依赖任何表。

### 2. from 查询

```sql
select <col1>, <col2> ... from <tableName>;

-- 指定列
select sno, name, gender, birthday from student;

-- 查询所有列（企业开发不推荐用 *，因为有额外的解析/传输开销，且表结构变更会受影响）
select s.* from student as s;
```

**列别名与表别名：**

```sql
select sno as 学号, name as 姓名 from student s;   -- as 可省略
```

### 3. where 条件查询

```sql
select <col1>, <col2> ... from <tableName> where <condition>;
```

条件写法见第 3 章的「六类 where 条件」。

### 4. group by 分组查询

分组的目的通常是**统计**，必须配合聚合函数使用。

| 聚合函数 | 作用 |
| --- | --- |
| `count(x)` | 统计数量 |
| `max(col)` | 最大值 |
| `min(col)` | 最小值 |
| `sum(col)` | 求和 |
| `avg(col)` | 平均值 |

```sql
select <col1>, <col2> ... from <tableName> [where <condition>] group by <col>, ...;

-- 统计各性别人数
select gender, count(sno) from student group by gender;

-- 查询不同性别的最大生日
select gender, min(birthday) from student group by gender;
```

> **分组铁律：select 后面的列，要么出现在 `group by` 里，要么被聚合函数包住。** 否则 MySQL 会返回一个「无意义」的值（在 `ONLY_FULL_GROUP_BY` 模式下直接报错）。

### 5. having 分组后筛选

- `having` 必须出现在 `group by` **之后**，对**分组后的结果**做过滤；
- 执行时间**晚于 `where`**；
- `having` 后面**支持聚合函数**（这是 `where` 做不到的）。

```sql
select <col1> ... from <tableName> [where <condition>]
    group by <col> ... [having <condition>];

-- 查询同性别且同日出生的「性别、生日、人数」（人数 > 1）
select gender, birthday, count(1) from student
    group by gender, birthday having count(1) > 1;

-- 先 where 过滤男，再分组，再 having 筛人数
select gender, birthday, count(1) from student where gender = 'm'
    group by gender, birthday having count(1) > 1;
```

**where 与 having 的区别（高频）：**

| 对比项 | where | having |
| --- | --- | --- |
| 执行时机 | 分组**前**过滤行 | 分组**后**过滤组 |
| 能否用聚合函数 | **不能** | **能** |
| 位置 | `group by` 之前 | `group by` 之后 |

### 6. order by 排序

- `asc`：升序（默认）；`desc`：降序。

```sql
select ... from <tableName> [where ...]
    [group by ... [having ...]]
    order by <col> [asc|desc], ...;

-- 按生日降序，生日相同按成绩降序
select * from student order by birthday desc, score desc;
```

**把 null 排到最后的技巧：**

```sql
-- birthday is not null 是布尔值，升序时 false(0) 在前、true(1) 在后
select * from student order by birthday is not null, birthday desc;
```

### 7. limit 分页查询

- `offset`：偏移量，默认从 0 开始；`rows`：每页条数。
- 两种写法：`limit <rows> offset <offset>` 或 `limit <offset>, <rows>`。
- **分页公式：`offset = (page - 1) * rows`**

```sql
-- 每页 2 条
select * from student limit 2 offset 0;   -- 第 1 页
select * from student limit 2 offset 2;   -- 第 2 页
select * from student limit 2 offset 4;   -- 第 3 页
select * from student limit 2 offset 6;   -- 第 4 页

-- 等价简写（offset, rows）
select * from student limit 0, 2;
select * from student limit 2, 2;
select * from student limit 2;            -- 省略 offset，默认 0
```

> **深分页性能坑**：`limit 1000000, 20` 会先扫描并丢弃前 100 万行再取 20 行，越翻越慢。优化思路是用**游标/延迟关联**（`where id > 上一页最大id limit 20`）。

### 8. 基础查询完整语法与执行顺序

```sql
select <col>, ...
    from <tableName>
    [where <condition>]
    [group by <col>, ... [having <condition>]]
    [order by <col> [asc|desc], ...]
    [limit [offset,] rows];
```

**SQL 执行顺序（重点）：**

```
from  ->  where  ->  group by  ->  having  ->  select  ->  order by  ->  limit
```

> 这解释了若干「反直觉」现象：`where` 里不能用 select 的列别名（因为 select 还没执行）；`order by` 里能用别名（因为 select 已执行）；`having` 能用聚合函数（因为分组已完成）。

## 二、常用命令速查

```sql
select count(1) from t;                           -- 总条数
select col, count(1) from t group by col;         -- 分组统计
select col, count(1) from t group by col having count(1)>1;
select * from t order by col desc limit 10;       -- Top 10
select * from t limit 20 offset 40;               -- 分页
```

## 三、高频面试题（附答案）

**Q1：`count(*)`、`count(1)`、`count(col)` 有什么区别？**

`count(*)` 和 `count(1)` 统计**所有行**（含 null 行），性能基本相当，InnoDB 有优化；`count(col)` **不统计该列为 null 的行**，且需要判断值是否为 null，略慢。业务上「统计行数」用 `count(*)` 即可。

**Q2：`where` 和 `having` 的区别？**

`where` 在**分组前**过滤行，**不能用聚合函数**；`having` 在**分组后**过滤组，**能用聚合函数**。能用 `where` 先过滤的，就绝不要拖到 `having`——越早过滤数据量越小，性能越好。

**Q3：SQL 的书写顺序和执行顺序分别是什么？**

书写：`select ... from ... where ... group by ... having ... order by ... limit`；执行：`from → where → group by → having → select → order by → limit`。面试爱考「为什么 select 别名能在 order by 用、不能在 where 用」，根因就在执行顺序。

**Q4：`group by` 后 select 的列有什么约束？**

只能是 **`group by` 里出现的列**，或者**被聚合函数包住的列**。这是 SQL 标准的语义要求，否则返回的值不确定。MySQL 的 `ONLY_FULL_GROUP_BY` 模式会直接报错。

**Q5：`count(1)`、`count(*)`、`count(col)` 哪个最快？**

严格说 `count(*)` 和 `count(1)` 最快（InnoDB 会选最小的索引扫描计数），`count(col)` 因为要判断 null 会略慢。但差异通常可忽略，**可读性优先**。

**Q6：`limit` 的两种写法？分页公式是什么？**

`limit <rows> offset <offset>` 和 `limit <offset>, <rows>` 等价。分页公式 `offset = (page - 1) * rows`，第 1 页 offset 为 0。

**Q7：深分页为什么慢？怎么优化？**

`limit 1000000, 20` 需要先定位并丢弃前 100 万行。优化：① **游标法**——记住上一页最大 id，`where id > last_id limit 20`；② **延迟关联**——先在索引上分页拿到主键，再回表；③ 业务上限制最大翻页深度。

**Q8：`order by` 底层怎么排序？**

MySQL 有两种：① **索引排序**——如果 `order by` 的列正好有序索引，直接按索引顺序读，最快；② **文件排序（filesort）**——没有合适索引时，把结果集放进排序缓冲区排序，数据量大时会用磁盘临时文件，较慢。所以「经常排序的字段应该建索引」。

**Q9：`order by` 多字段时怎么定优先级？**

从左到右依次比较，先按第一个字段排，第一个字段相等时再看第二个。`order by a desc, b asc` 就是「a 降序，a 相同时 b 升序」。

**Q10：`select *` 为什么被诟病？**

① 传输无用列，浪费带宽和内存；② 可能让 `covering index`（覆盖索引）失效，多一次回表；③ 表结构变更（加列）会影响程序解析。生产环境应显式列出所需列。

**Q11：`group by` 和 `distinct` 有什么区别？**

`distinct` 只做**去重**，不能带聚合；`group by` 是**分组统计**，可配合聚合函数。仅去重时 `distinct` 更直观；需要统计时用 `group by`。某些场景两者执行计划相同。

**Q12：如何在分组统计中统计「去重后的数量」？**

`count(distinct col)`，例如统计某天有多少个不同的用户下单：`select count(distinct user_id) from orders where ...`。

## 四、易错点

1. **`where` 里用聚合函数**：直接报错，聚合函数只能出现在 `having` 或 `select`。
2. **`where` 里用 select 别名**：执行顺序决定别名还没生成，不能用；`order by` 可以用。
3. **`group by` 后 select 未分组、未聚合的列**：结果不可预期，严格模式下报错。
4. **`count(col)` 漏掉 null 行**：想统计总数请用 `count(*)`。
5. **`limit` 参数顺序写反**：`limit offset, rows`，第一个是偏移量、第二个是条数，写反了结果完全不同。
6. **深分页直接上大 offset**：性能会崩，记得用游标或延迟关联。
7. **`order by` 用不上索引**：给排序列建索引才能走索引排序，否则 filesort。
8. **null 参与排序**：MySQL 中 null 视为最小值，升序排最前、降序排最后；要把它排最后可用 `order by col is not null, col desc`。
9. **`select *` 在连接查询中列名冲突**：同名列会被后者覆盖，务必显式指定列或加表前缀。
10. **`having` 做本该 `where` 做的过滤**：性能差，因为分组后才过滤，数据量已被放大。
