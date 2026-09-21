---
title: MySQL 笔记 · 第 2 章：数据库与表操作
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, DDL, 数据类型, 建表]
summary: DDL 第一章：库的增删查用、13 种常见数据类型与选型（含金额为何用 decimal）、建表语法与字段注释、desc 看结构、show create table 看建表语句，以及 alter table 改名/加列/删列/改类型/改列名，附 10 道高频面试题。
---

## 一、必须记住的知识点

### 1. database 的基本操作

```sql
-- 创建数据库
create database [if not exists] <databaseName>;

-- 删除数据库
drop database [if exists] <databaseName>;

-- 查询当前用户下的所有数据库
show databases [like <condition>];

-- 查询所有以 m 开头的数据库，% 匹配 0 到多个字符
show databases like 'm%';

-- 切换数据库（可以不写分号结尾）
use <databaseName>;
```

> **`if not exists` / `if exists` 是防御性写法**：加上后，重复建库不会报错、删不存在的库也不会报错，脚本可以重复执行。

### 2. 常见数据类型与选型

| 数据类型 | Python 类型 | 备注 |
| --- | --- | --- |
| tinyint | int | 1 字节，-128 ~ 127 |
| smallint | int | 2 字节，-32768 ~ 32767 |
| int / integer | int | 4 字节，约 ±21 亿 |
| bigint | int | 8 字节，±2^63 |
| float / double | float | 浮点数，可设有效长度与精度，如 `double(11, 2)` |
| char | str | **定长**字符串，如 `char(5)` 固定占 5 个字符 |
| varchar | str | **变长**字符串，`varchar(5)` 最大 5 个字符，上限 65535 |
| text / longtext | str | 文本 / 长文本，存超大字符串（新闻正文、小说章节） |
| enum | str | 枚举，`enum('m','f','s')` 只能取三者之一 |
| date | date | 日期，精确到年月日 |
| datetime | datetime | 日期时间，可精确到微秒，如 `datetime(6)` |
| bool / boolean | bool | 布尔，0 = false，1 = true |
| decimal | - | **高精度浮点**，解决浮点精度损失，用于金额 |
| longblob | bytes | 二进制流，存音视频图片（通常不建议） |

**选型要点：**

- **金额一律用 `decimal`**，绝不用 `float/double`——浮点数有精度损失，`0.1 + 0.2 != 0.3` 的坑同样存在于数据库。
- **`char` vs `varchar`**：长度固定的用 `char`（如性别、身份证、MD5 值），长度可变的用 `varchar`（如姓名、地址）。`char` 定长读取快但可能浪费空间，`varchar` 省空间但要额外存长度。
- **整数能小则小**：状态字段用 `tinyint` 就够，没必要 `bigint`；但主键建议用 `bigint`，避免自增耗尽。

### 3. table 的基本操作

```sql
-- 创建表
create table [if not exists] <tableName>(
    <columnName> <type> [constraint约束] [注释],
    <columnName> <type> [constraint约束] [注释],
    ...
);

-- 新建学生表（学号、姓名、性别、手机号、出生日期、学校、校长、注册时间）
create table if not exists student(
    sno        varchar(20) comment '学号',
    name       varchar(10) comment '姓名',
    gender     enum('m','f','s') comment '性别',
    tel        varchar(11) comment '手机号',
    birthday   date        comment '出生日期',
    school     varchar(50) comment '学校名',
    leader     varchar(10) comment '校长',
    createTime datetime    comment '注册时间'
);
```

```sql
-- 删除表
drop table [if exists] <tableName>;

-- 查询当前库下所有表
show tables [like <condition>];

-- 查看表结构
desc <tableName>;
describe <tableName>;

-- 查看建表语句
show create table <tableName>;
```

### 4. 修改表结构 alter table

```sql
-- 修改表名
alter table <tableName> rename to <newTableName>;
rename table <tableName> to <newTableName>;

-- 添加字段（after 可指定插入位置）
alter table <tableName> add [column] <columnName> <type> [约束] [注释] [after <columnName>];

-- 删除字段
alter table <tableName> drop [column] <columnName>;

-- 修改字段类型（有可能会失败，比如已有数据无法转换）
alter table <tableName> modify <columnName> <type> [注释];

-- 修改字段名（必须重写类型）
alter table <tableName> change <oldColumnName> <newColumnName> <type> [注释];
```

> `modify` 只改类型、不改名；`change` 改名（也能顺手改类型）。**`change` 必须把字段类型也写出来，不能省略**。

### 5. 命名与注释规范

- 表名、列名建议全小写 + 下划线（`tb_user_info`、`create_time`），避免跨平台大小写问题；
- 每个字段都加 `comment`，这是最便宜也最有价值的文档；
- 常用表名前缀区分：`tb_`（业务表）、`sys_`（系统表）等，属于团队约定。

## 二、常用命令速查

```sql
show databases;              -- 所有库
use db_name;                 -- 切库
show tables;                 -- 当前库所有表
desc tb_name;                -- 表结构
show create table tb_name;   -- 建表语句
show create database db_name;-- 建库语句
```

## 三、高频面试题（附答案）

**Q1：`char` 和 `varchar` 的区别？**

`char` 是**定长**，`char(10)` 无论存几个字符都占 10 个字符的空间，不足补空格，读取快；`varchar` 是**变长**，按实际长度存储，另加 1~2 字节存长度。长度固定的（性别、MD5、身份证）用 `char`，长度变化大的（姓名、地址）用 `varchar`。

**Q2：为什么金额字段要用 `decimal` 而不是 `float`？**

因为 `float/double` 是二进制浮点，无法精确表示十进制小数，会出现精度损失（如 `0.1 + 0.2` 得到 `0.30000000000000004`）。`decimal` 是十进制存储，精度可控，`decimal(10,2)` 表示总 10 位、小数 2 位，适合金额。

**Q3：`int(11)` 里的 11 是长度限制吗？**

**不是**。这个数字是「显示宽度」，只在配合 `zerofill` 时用来补零，**不限制取值范围**。`int` 的取值范围由类型本身决定（4 字节）。这一点在 MySQL 8.0 已被标记为废弃。

**Q4：`varchar(5)` 能存 5 个汉字吗？**

能，也不完全能。MySQL 5.0 以后 `varchar(n)` 的 n 指**字符数**而非字节数，所以能存 5 个汉字。但受**行记录总长度上限（约 65535 字节）**约束，UTF-8 下一个汉字占 3 字节，实际可用字符数会受整行长度影响。

**Q5：`truncate`、`drop`、`delete` 有什么区别？**

- `delete`：DML，删**数据**，可带 where 条件，可回滚，表结构保留；
- `truncate`：DDL，清空**全部数据**，不能带条件，不可回滚，表结构保留；
- `drop`：DDL，连**表结构**一起删掉，表不存在了。

**Q6：`modify` 和 `change` 的区别？**

`modify` 只能改字段**类型/约束**，不能改名；`change` 可以**改字段名**（同时必须重写类型）。记法：change 的「c」= 改名（change name）。

**Q7：建表时要不要加 `if not exists`？**

建议加。这样脚本可重复执行不报错，适合初始化脚本；但要注意它会「静默跳过」，如果表结构变了不会自动改，需要配合迁移脚本。

**Q8：`desc` 和 `show create table` 有什么区别？**

`desc` 展示字段名、类型、是否可空、键、默认值等**结构化摘要**；`show create table` 展示**完整的建表 SQL**，包含字符集、引擎、注释等全部细节，适合备份表结构或排查差异。

**Q9：为什么建议给每个字段加 `comment`？**

注释直接存在表元数据里，`desc`、`show create table` 和各类客户端都能看到，是团队协作和后期维护成本最低的文档形式。

**Q10：一张表最多可以有多少列？**

理论上限是 **4096 列**（受 InnoDB 行格式和 65535 字节行长度限制，实际远达不到）。实践中超过几十列就应考虑垂直拆表。

## 四、易错点

1. **`drop table` 不可逆**：连结构带数据一起没了，执行前务必确认库名和表名，别在 `use` 错库时手抖。
2. **`modify` 忘了写约束会丢约束**：`modify` 是「重写」字段定义，原来写的 `not null`、`default` 不写就没了。
3. **`change` 必须带类型**：只写新旧列名会直接语法报错。
4. **`rename to` 和 `rename table` 不是一回事**：前者是 `alter table` 的子句，后者是独立语句，两者都能改名但语法位置不同。
5. **`varchar` 括号值别乱填大**：`varchar(255)` 与 `varchar(20)` 在部分场景性能不同，且总行长度有上限，按实际需要给。
6. **`enum` 取值改了要改表结构**：枚举值写死在表定义里，新增取值需要 `alter table`，扩展性不如用状态码 + 字典表。
7. **表名大小写在 Linux 敏感**：本地 Windows 跑通的 `User` 表，部署到 Linux 后 `user` 就找不到。
8. **`desc` 不是「降序」吗？**：这里 `desc` 是 `describe` 的缩写（查看结构），和 `order by ... desc`（降序）是两个完全无关的用法，别混。
