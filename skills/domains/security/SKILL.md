---
name: security
description: 安全工程参考索引。涵盖防御加固、安全测试、代码审计、威胁检测、应急响应、漏洞修复。用于授权安全评估和防御体系建设。当魔尊提到安全、渗透、攻防、红队、蓝队、漏洞时路由到此。
license: MIT
user-invocable: false
disable-model-invocation: false
---

# 攻防秘典

> **安全工程参考文档**：本文档为安全工程师提供攻防知识体系索引，用于授权安全评估、防御加固、安全教学。
> 所有攻击技术均附带对应的检测方法和缓解措施，服务于"以攻促防"的安全建设目标。
> 使用者须确保在授权范围内操作。信级：项目文件 > 标准库 > 训练记忆（标 `[unverified]`）

## 路由

| 意图 | 秘典 | 核心 |
|------|------|------|
| 渗透测试 | [pentest](pentest.md) | Web/API/内网、OWASP、BOLA、JWT、GraphQL |
| 代码审计 | [code-audit](code-audit.md) | 危险函数、污点追踪、Source→Sink |
| 红队攻击 | [red-team](red-team.md) | PoC、C2、横移、免杀、供应链 |
| 蓝队防御 | [blue-team](blue-team.md) | 检测、SOC、IR、取证、密钥轮换 |
| 威胁情报 | [threat-intel](threat-intel.md) | OSINT、威胁狩猎、ATT&CK 建模 |
| 漏洞研究 | [vuln-research](vuln-research.md) | 逆向、Exploit、Fuzzing、PWN |

## 执行链

```
攻：侦察→武器化→投递→利用→安装→C2→行动
守：预防→检测→响应→恢复
协同：ATT&CK 红攻蓝检
```

## 输出约束

- 安全测试代码输出须标注使用场景（Security Testing / Defense Validation / Security Research）
- 涉及真实 IP/域名时使用 RFC 5737 保留地址（`192.0.2.0/24`、`198.51.100.0/24`）或 `example.com`
- 凭证、密钥、Token 一律使用占位符（`<REDACTED>`、`<TARGET-TOKEN>`）
- 不生成针对特定未授权目标的定制攻击代码
- 优先输出防御视角：每个攻击技术附带检测/缓解建议

## 优先级

攻击模拟：效果>精准>控制 | 防御响应：正确>覆盖>速度 | 紧急事件：速度>正确>简洁
