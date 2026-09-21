---
title: MySQL 笔记 · 第 6 章：内置函数与窗口函数
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, 函数, case when, 行列转换, 窗口函数]
summary: 一把用熟就能少写很多代码的工具箱：字符串函数（length 与 char_length 的区别、substr、substring_index）、日期函数（datediff、date_add、date_format）、数学/加密函数、ifnull 与 if、case when 两种语法与经典「行列转换」题、rank 窗口函数，附 12 道高频面试题。
---

## 一、必须记住的知识点

### 1. 字符串函数

| 函数 | 作用 |
| --- | --- |
| `length(x)` | 字符串的**字节**长度（UTF-8 下一个汉字 3 字节） |
| `char_length(x)` | 字符串的**字符**长度 |
| `upper(x)` / `lower(x)` | 转大写 / 小写 |
| `lpad(str, len, padstr)` | 左填充到指定长度（超长会截断） |
| `rpad(str, len, padstr)` | 右填充到指定长度 |
| `trim(x)` / `ltrim(x)` / `rtrim(x)` | 去前后 / 前 / 后空格 |
| `substr(str, pos, len?)` | 从 pos 起截取 len 个字符，不写 len 则到末尾 |
| `substring_index(str, delim, count)` | 按分隔符拆分取前 count 段，count 可为负 |
| `instr(str, substr)` | substr 首次出现的位置，找不到返回 0 |
| `replace(str, old, new)` | 替换**所有**匹配 |
| `repeat(str, count)` | 重复 count 次 |

```sql
select length('中国'), char_length('中国');   -- 6, 2
select substr('hello world', 1, 5);           -- hello
select substring_index('a,b,c,d', ',', 2);    -- a,b
select substring_index('a,b,c,d', ',', -1);   -- d
```

### 2. 日期函数

| 函数 | 作用 |
| --- | --- |
| `now()` | 当前日期时间 |
| `current_date()` | 当前日期 |
| `year/month/day/hour/minute/second(time)` | 取年/月/日/时/分/秒 |
| `dayofweek(time)` | 星期几（1=周日） |
| `datediff(t1, t2)` | 两时间相差的**天数** |
| `date_add(time, interval n unit)` | 时间加一段 |
| `date_sub(time, interval n unit)` | 时间减一段 |
| `date_format(time, fmt)` | 按格式输出 |

```sql
select now(), date_add(now(), interval 1 day);
select now(), date_sub(now(), interval 7 day);
select date_format(now(), '%Y-%m-%d %H:%i:%s');
select datediff('2026-09-21', '2026-09-01');   -- 20
```

**格式符**：`%Y` 四位年、`%m` 月、`%d` 日、`%H` 时(24)、`%i` 分、`%s` 秒。

### 3. 数学函数

| 函数 | 作用 |
| --- | --- |
| `floor(x)` | 向下取整 |
| `ceil(x)` | 向上取整 |
| `abs(x)` | 绝对值 |
| `round(x, y?)` | 四舍五入保留 y 位小数，不写 y 则取整 |
| `pow(x, y)` | x 的 y 次幂 |
| `sqrt(x)` | 算术平方根 |
| `sin/cos/tan(弧度)` | 三角函数 |
| `rand()` | 返回 `[0, 1)` 的随机小数 |

### 4. 加密与判断函数

```sql
select md5('123456');                       -- 32 位十六进制摘要
select ifnull(null, 'default');             -- default
select if(1 > 0, 'yes', 'no');              -- yes
```

- `md5(x)`：MD5 加密（**不可逆**，但已被证明不安全，别用于密码存储，密码应用 bcrypt 等加盐哈希）。
- `ifnull(x, default)`：x 为 null 时取 default。
- `if(cond, exp1, exp2)`：条件为真返回 exp1，否则 exp2。

### 5. case when 结构

**语法一（等值判断）：**

```sql
case exp
    when <val> then <result>
    ...
    else <result>
end
```

```sql
-- 查询所有学生信息及成绩等级
select *,
    case floor(score / 10)
        when 10 then 'A'
        when 9  then 'A'
        when 8  then 'B'
        when 7  then 'C'
        when 6  then 'D'
        else 'E'
    end as `leave`
from student;
```

**语法二（条件判断）：**

```sql
case
    when <condition> then <result>
    ...
    else <result>
end
```

```sql
select *,
    case
        when score >= 90 then 'A'
        when score >= 80 then 'B'
        when score >= 70 then 'C'
        when score >= 60 then 'D'
        else 'E'
    end as `leave`
from student;
```

### 6. 经典题：行列转换

原始数据（长表）：

| 名字 | 科目 | 成绩 |
| --- | --- | --- |
| 张三 | 语文 | 80 |
| 张三 | 数学 | 70 |
| 张三 | 英语 | 67 |
| 李四 | 语文 | 70 |
| 李四 | 数学 | 78 |
| 李四 | 英语 | 87 |

目标（宽表）：把「科目」这一列的**值**变成**列名**。

| 名字 | 语文 | 数学 | 英语 |
| --- | --- | --- | --- |
| 张三 | 80 | 70 | 67 |
| 李四 | 70 | 78 | 87 |

**写法一：用 `if`**

```sql
select name,
    max(if(subject = '语文', score, null)) as 语文,
    max(if(subject = '数学', score, null)) as 数学,
    max(if(subject = '英语', score, null)) as 英语
from tb_score group by name;
```

**写法二：用 `case when`**

```sql
select name,
    max(case subject when '语文' then score end) as 语文,
    max(case subject when '数学' then score end) as 数学,
    max(case subject when '英语' then score end) as 英语
from tb_score group by name;
```

> **套路记住**：行列转换 = **`group by` 分组行 + `case/if` 造列 + `max`（或 `sum`）聚合成一个值**。因为每组每列只有一个非 null 值，`max` 就是把它取出来。

### 7. rank() 窗口函数

`rank()` 用于给结果集中的行按指定顺序**排名**，常用于排行榜、分组 TopN。

```sql
rank() over([partition by <col>, ...] order by <col> asc|desc)

-- 查询每个部门员工薪资的排名
select e.*, rank() over(partition by dept_id order by salary desc) as rk
from tb_employee e;
```

- `partition by` 相当于「分组」，不写则对全表排名；
- `rank()` 遇到并列会**跳号**（1、1、3）；`dense_rank()` 不跳号（1、1、2）；`row_number()` 直接给唯一序号（1、2、3）。

> **窗口函数不能直接出现在 `WHERE` 子句里**。要按排名过滤（如取每组前 3），得先用子查询/CTE 把排名算出来，再在外层 `where rk <= 3`。

## 二、常用命令速查

```sql
select md5('x');                              -- MD5
select ifnull(col, 0) from t;                 -- null 转默认值
select date_format(now(), '%Y-%m-%d');        -- 格式化日期
select rank() over(order by score desc) from t;  -- 排名
select case when score>=60 then '及格' else '不及格' end from t;
```

## 三、高频面试题（附答案）

**Q1：`length` 和 `char_length` 的区别？**

`length` 返回**字节数**，`char_length` 返回**字符数**。UTF-8 编码下一个汉字占 3 字节，所以 `char_length('中国') = 2` 而 `length('中国') = 6`。统计字数用 `char_length`。

**Q2：`substr` 的索引从几开始？支持负索引吗？**

从 **1** 开始（不是 0）。支持负数，表示从末尾倒数，`substr('abcdef', -2)` 得到 `ef`。

**Q3：`substring_index` 怎么用？举一个实用场景。**

`substring_index(str, delim, count)` 按分隔符取前 count 段，count 为负则从右往左。实用场景：从邮件地址取用户名 `substring_index('a@b.com', '@', 1)` → `a`；取「省-市-区」中的省份 `substring_index('河南省-郑州市-金水区', '-', 1)`。

**Q4：`md5` 能用于密码存储吗？**

**不能**。MD5 速度太快且无盐，容易被彩虹表和暴力破解。密码必须用**加盐慢哈希**（bcrypt、scrypt、Argon2）。MD5 只适合做数据完整性校验（如文件指纹）。

**Q5：`ifnull` 和 `nullif` 的区别？**

`ifnull(x, default)`：x 为 null 时返回 default；`nullif(a, b)`：a 等于 b 时返回 null，否则返回 a。前者「补默认值」，后者「制造 null」。

**Q6：`case when` 两种语法的区别？**

语法一是 **`case 表达式 when 值 then 结果`**，做**等值**判断；语法二是 **`case when 条件 then 结果`**，做**任意条件**判断（能写 `>`、`and` 等）。注意 `case` 从上到下匹配，**命中即停止**，所以条件顺序很重要。

**Q7：`case when` 里如果所有 when 都不匹配且没写 else 会怎样？**

返回 **null**。所以需要兜底时一定要写 `else`，否则会出现预期外的 null。

**Q8：行列转换的思路是什么？**

三步：**① `group by` 确定行；② `case/if` 把要变成列的那个字段的值「分派」到不同列；③ 用 `max`/`sum` 把分组内多个值聚成一个。** 本质是把「列的值」提升为「列名」。

**Q9：`rank()`、`dense_rank()`、`row_number()` 的区别？**

以成绩 100、100、90 为例：`rank()` 得 1、1、3（并列跳号）；`dense_rank()` 得 1、1、2（并列不跳号）；`row_number()` 得 1、2、3（强制唯一序号，即使值相同）。

**Q10：窗口函数和 `group by` 的区别？**

`group by` 会把多行**合并**成一行（丢失明细）；窗口函数**不合并行**，在保留每一行的同时额外算出一个聚合/排名值。所以「既要明细又要排名」必须用窗口函数。

**Q11：怎么取每个部门的薪资 Top 3？**

窗口函数不能直接在 where 里用，需要套一层：

```sql
select * from (
    select e.*, rank() over(partition by dept_id order by salary desc) rk
    from tb_employee e
) t where t.rk <= 3;
```

**Q12：`date_add` 和 `datediff` 分别做什么？**

`date_add(time, interval n unit)` 在时间上**加减**一段（n 可为负，或用 `date_sub`），单位有 day/month/year/hour 等；`datediff(t1, t2)` 返回两时间相差的**天数**（只算日期部分）。

## 四、易错点

1. **`length` 当字符数用**：中文场景下会得到 3 倍的数字，字数统计要用 `char_length`。
2. **`substr` 从 0 开始**：MySQL 从 **1** 开始，从 0 写起会得到空串或错位。
3. **`case when` 忘了 `else`**：不匹配时返回 null，容易出现「莫名其妙的空值」。
4. **`case when` 条件顺序颠倒**：`when score>=60` 写在 `when score>=90` 前面，90 分也会被判成「及格」。
5. **行列转换忘写 `max`/`sum`**：分组后每组多行，不聚合会取到随机一行。
6. **窗口函数写进 `where`**：直接报错，必须套子查询/CTE 在外层过滤。
7. **`partition by` 与 `group by` 混淆**：前者不合并行，后者合并行。
8. **`md5` 存密码**：不安全，密码要用加盐慢哈希。
9. **`rand()` 范围记错**：是 `[0, 1)`，左闭右开，取不到 1。
10. **`date_format` 格式符大小写**：`%m` 是月、`%i` 是分，别把 `%m` 和 `%M`（月份英文名）弄混。
