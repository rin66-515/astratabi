# 2026-08-16 中文销售包文件名兼容 实装・试验・Review记录

## 1. 对象范围

- 管理台资料包上传
- ZIP文件名解析
- SHA-256 sidecar读取与保存
- Product ID映射

## 2. 实装内容

- 接受已登记的“中文售卖名_ASRAY内部商品ID_vX.Y.Z_YYYYMMDD.zip”。
- 继续兼容既有英文内部商品ID文件名。
- 中文售卖名使用服务端固定对照表，不接受任意前缀。
- 解析后仅把内部商品ID交给既有Product ID／Entitlement映射。
- SHA-256 sidecar统一使用UTF-8读取和保存，保证中文文件名可逆。

## 3. 试验结果

- `PackageReleaseServiceTest`定向试验：20件成功。
- 后端全量试验：36件成功，失败0、Error 0。
- 前端TypeScript／Vite构建：成功。
- 覆盖11种Portal已配置商品的中文名称、旧英文名称、未登记中文前缀拒绝、Checksum一致性。

## 4. Review结论

- 中文名称只承担销售与人工识别用途，不参与权限判定。
- 内部商品ID仍是Product ID和Entitlement映射的唯一输入。
- 完整模拟项目源码包未纳入自动开户商品范围。
- 本地实现和回归通过；生产上传验收需在服务器部署后另行执行。
