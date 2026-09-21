---
title: MySQL 笔记 · 第 3 章：数据操作与约束设计
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, DML, 约束, 范式, 表关系]
summary: DML 与设计篇：insert 两种写法与批量插入、where 六类条件（关系/逻辑/区间/枚举/模糊/空值）、delete 与 truncate 的五点区别、六种约束、三大范式、一对一/一对多/多对多/树状四种表关系建模，附 12 道高频面试题。
---

## 一、必须记住的知识点

### 1. 插入数据 insert

```sql
-- 指定字段插入（推荐写法，字段与值个数、顺序必须一一匹配）
insert into student(sno, name, birthday, tel, createTime) values
    ('202201033334', '张小小', '1990-12-11', '13643654367', now());

-- 不指定字段：必须按建表顺序给「所有字段」插值（不推荐，表结构一变就崩）
insert into student values
    ('202201033333', '张三', 'm', '13312344321', '1990-10-10', '郑州大学', '李四', now());
```

> `now()` 是内置函数，返回当前系统时间。

### 2. 批量插入

```sql
insert into student(sno, name, birthday, tel, createTime) values
    ('202201033335', '张中中', '1990-12-11', '13643654367', now()),
    ('202201033336', '张大大', '1990-12-11', '13643654367', now()),
    ('202201033337', '张小大', '1990-12-11', '13643654367', now()),
    ('202201033338', '张大小', '1990-12-11', '13643654367', now());
```

**为什么批量插入比循环单条快？** 单条插入每次都是一个独立事务，要反复写日志、刷盘、网络往返；批量插入合并为一次往返、一个事务，效率高一个数量级。

### 3. where 条件：六类写法

`where` 用于 `update`、`delete`、`select`，条件写在 `where` 之后。

**（1）关系条件**：`>`、`>=`、`<`、`<=`、`=`、`!=`、`<>`（不等于）

```sql
update student set school = '南京大学', leader = '小南' where sno = '202201033336';
update student set leader = '小张' where createTime > '2025-04-29 09:35:00';
```

**（2）逻辑条件**：`and`（与）、`or`（或）

```sql
update student set gender = 'f' where sno = '202201033337' and name = '张三';
update student set gender = 'f' where sno = '202201033337' or  name = '张三';
```

**（3）区间查询**：`between <m> and <n>`（要求 m <= n，且**闭区间**）

```sql
update student set gender = 'm'
    where sno between '202201033335' and '202201033338';
```

**（4）枚举查询**：`in`

```sql
update student set birthday = '1990-02-10', gender = 's'
    where name in ('张三', '张大胆', '张胆大');
```

**（5）模糊查询**：`like`，`%` 匹配 0 到多个字符，`_` 匹配**恰好 1 个**字符

```sql
-- 名字包含「小」的学生
update student set birthday = '2000-10-10' where name like '%小%';

-- 姓张、且名字只有 2 个字
update student set gender = 'f' where name like '张_';
```

**（6）空值查询**：`is null` / `is not null`

```sql
update student set school = '兰州大学' where gender is null;
```

> **注意：判断空值不能用 `= null`，必须用 `is null`。** 因为 `null` 表示「未知」，任何值与「未知」比较结果都是未知（不是 true）。

### 4. 修改数据 update

```sql
update <tableName> set <col> = <val>[, <col> = <val> ...] [where <condition>];

-- 不带 where 会更新全表（危险！）
update student set school = '郑州大学', leader = '李四';
```

### 5. 删除数据 delete

```sql
delete from <tableName> [where <condition>];

delete from student where name = '张中中';

-- 截断表：清空全部数据，属于 DDL（慎用）
truncate table student;
```

### 6. delete 与 truncate 的区别

| 对比项 | delete | truncate |
| --- | --- | --- |
| 条件 | 支持 where 条件删除 | 不能加条件，只能清空全表 |
| 语言分类 | DML | DDL |
| 回滚 | 事务环境下**可回滚** | 一旦执行**无法撤回** |
| 空间 | 只删数据，**不释放**占用空间 | 删数据同时**释放空间** |
| 自增 | 自增值不重置 | 自增值**重置**为初始值 |

**外键陷阱**：如果表被外键引用，`truncate` 默认会失败，需要临时关闭外键检查：

```sql
set foreign_key_checks = 0;   -- 禁用外键检查
truncate table tb_user;
set foreign_key_checks = 1;   -- 重新启用（别忘恢复）
```

### 7. 六种约束类型

约束是数据库为保证**数据完整性、准确性**提供的校验机制。

| 约束 | 关键字 | 特点 |
| --- | --- | --- |
| 主键约束 | `primary key` | 值**唯一且非空**，一张表只能有一个 |
| 唯一约束 | `unique` | 值唯一，**允许为空**（多个 null 不冲突） |
| 非空约束 | `not null` | 值不允许为空（默认是空约束） |
| 默认约束 | `default` | 插入时不给值则取默认值 |
| 检查约束 | `check` | MySQL 8.0.16 前**不支持**（会被忽略） |
| 外键约束 | `foreign key` | 维护表与表之间的关系 |

### 8. 三大范式

范式是设计表的规则，共有六大范式，**企业开发满足三范式即可**，目的是减少数据冗余。

- **第一范式 1NF**：字段**不可再分**，具有原子性。关系型表天生满足。
- **第二范式 2NF**：必须有**主键**（一张表最多一个主键），且非主键字段完全依赖主键。
- **第三范式 3NF**：所有字段和主属性是**直接关系**而非间接关系，消除**传递依赖**。

> 例：订单表里存了「用户 id」又存「用户名」就违反 3NF——用户名可由用户 id 推出，属于传递依赖，应该只存用户 id。**但实际开发中为了减少连表，常故意反范式冗余少量字段**，这是权衡而非错误。

### 9. 表与表之间的关系建模

**（1）一对一（One-To-One）**

```sql
-- 父表
create table tb_user(
    id          bigint primary key auto_increment comment '主键',
    username    varchar(50) unique not null comment '用户名',
    password    varchar(32) not null comment '密码',
    state       boolean default 0 comment '激活状态',
    create_time datetime(3) comment '注册时间'
);

-- 子表：外键 + unique 实现一对一
create table tb_user_info(
    id      bigint primary key auto_increment comment '主键',
    name    varchar(20) comment '真实姓名',
    gender  enum('m','f','s') comment '性别',
    tel     varchar(11) comment '手机号',
    user_id bigint unique,
    constraint tb_user_info_user_id_fk foreign key(user_id) references tb_user(id)
);

-- 另一种写法：共享主键（子表主键 = 父表主键）
create table tb_user_info2(
    id     bigint primary key comment '主键（同时也是外键）',
    name   varchar(20) comment '真实姓名',
    constraint tb_user_info2_fk foreign key(id) references tb_user(id)
);
```

**（2）一对多（One-To-Many）**：在「多」的一方加外键。

```sql
create table tb_address(
    id      bigint primary key auto_increment comment '主键',
    pro     varchar(20) comment '省份',
    city    varchar(20) comment '城市',
    detail  varchar(200) comment '详细地址',
    active  boolean comment '是否默认',
    user_id bigint comment '用户ID',
    foreign key(user_id) references tb_user(id)
);
```

**（3）多对多（Many-To-Many）**：必须引入**中间表**。

```sql
create table tb_role(
    id      bigint primary key auto_increment,
    name    varchar(20) comment '角色名',
    descript text comment '角色描述'
);

-- 中间表：用「联合主键」防止重复绑定
create table tb_role_user(
    user_id bigint comment '用户ID',
    role_id bigint comment '角色ID',
    foreign key(user_id) references tb_user(id),
    foreign key(role_id) references tb_role(id),
    primary key(user_id, role_id)
);
```

**（4）树状结构（自关联）**：外键指向**自己**。

```sql
create table tb_employee(
    id      bigint primary key auto_increment,
    name    varchar(20) comment '员工名',
    tel     varchar(11) comment '手机号',
    office  varchar(20) comment '职务',
    pid     bigint comment '上级ID',
    foreign key(pid) references tb_employee(id)
);
```

## 二、常用命令速查

```sql
insert into t(col1, col2) values (v1, v2);          -- 插入
insert into t(col1, col2) values (a1,a2),(b1,b2);   -- 批量插入
update t set col = v where cond;                    -- 更新
delete from t where cond;                           -- 删除
truncate table t;                                   -- 清空
```

## 三、高频面试题（附答案）

**Q1：`delete`、`truncate`、`drop` 的区别？**

`delete` 是 DML，删数据、可带条件、可回滚、不释放空间、不重置自增；`truncate` 是 DDL，清空全表、不能带条件、不可回滚、释放空间、重置自增，但保留表结构；`drop` 是 DDL，连表和结构一起删除。

**Q2：为什么 `truncate` 比 `delete` 快？**

`delete` 是逐行删除并写 undo/redo 日志以支持回滚；`truncate` 是直接**重建表**（丢弃数据页），几乎不写行级日志，所以快得多。

**Q3：判断空值为什么不能用 `= null`？**

SQL 的三值逻辑中，`null` 表示「未知」。任何值与「未知」比较结果都是「未知」（既不是 true 也不是 false），所以 `= null` 永远返回空结果集，必须用 `is null`。

**Q4：`like` 里 `%` 和 `_` 的区别？**

`%` 匹配 **0 到多个**任意字符；`_` 匹配**恰好 1 个**任意字符。`'张_'` 匹配「张 + 一个字」，`'张%'` 匹配所有姓张的。

**Q5：`between ... and ...` 是开区间还是闭区间？**

**闭区间**，等价于 `>= m and <= n`。且要求 m <= n，写反了返回空集。

**Q6：主键和唯一键的区别？**

主键**唯一且非空**，一张表只能有一个；唯一键**唯一但允许 null**（多个 null 不冲突），一张表可以有多个。

**Q7：为什么多对多一定需要中间表？**

因为两张表本身都没有位置存放「多对多」的对应关系，必须用第三张表，每行记录一对关联（user_id, role_id）。给这两个字段建**联合主键**可以防止同一关系被重复插入。

**Q8：外键有什么优缺点？**

优点是数据库层面保证**引用完整性**，防止插入不存在的父记录、防止删除被引用的父记录；缺点是**有性能开销**（每次写都要检查）、高并发下容易锁竞争、分库分表后无法跨库使用，所以互联网项目常**逻辑外键代替物理外键**。

**Q9：三范式是什么？实际开发要严格遵守吗？**

1NF 字段原子、2NF 有主键且完全依赖、3NF 消除传递依赖。实际开发**不严格**遵守，为了减少连表查询、提升读性能，会故意做**反范式**冗余，属于空间换时间的权衡。

**Q10：`not null` 和 `default` 一起用有意义吗？**

有。`not null` 保证不能显式插入 null，`default` 保证不写该字段时自动填默认值。两者配合能避免「漏填导致插入失败」，是很实用的组合。

**Q11：为什么插入时不指定字段名是不推荐的写法？**

因为它依赖表的**物理列顺序**，一旦表结构变更（加列、调序），SQL 就会错位甚至插入失败。显式写字段名可读性也更好。

**Q12：自增主键会有用完的一天吗？**

`int` 上限约 21 亿，高并发写入的系统可能耗尽，所以主键建议用 **`bigint`**。另外 `truncate` 会重置自增，`delete` 不会，注意业务是否依赖自增值。

## 四、易错点

1. **`update` / `delete` 忘写 `where`**：会更新/删除**全表**，生产事故的头号来源，执行前先 `select` 验证条件。
2. **`= null` 永远不成立**：必须 `is null` / `is not null`。
3. **`truncate` 无法回滚**：它属 DDL，误操作后只能靠备份恢复。
4. **`truncate` 被外键挡住**：需要临时 `set foreign_key_checks = 0`，**用完务必改回 1**。
5. **`between` 边界是闭区间**：想取「不含上界」要写成 `< n`。
6. **`unique` 允许多个 null**：以为「唯一就等于只能有一个 null」是常见误解。
7. **`check` 约束在旧版本会被忽略**：MySQL 8.0.16 之前写 `check` 不报错但**不生效**，别指望它兜底。
8. **`enum` 存的是索引**：底层按整数 1、2、3 存，改枚举值的顺序会影响已有数据含义，慎改。
9. **联合主键 vs 主键**：中间表用 `primary key(user_id, role_id)` 是**一张表一个联合主键**，不是两个主键。
10. **`float` 存金额**：精度丢失导致对账差几分钱，务必用 `decimal`。
