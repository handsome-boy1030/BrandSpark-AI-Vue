# Vue 3 + Vite

这是一个基于vue3 + C# + 大模型 的pc端网页 

C#数据库迁移
1. dotnet ef migrations add AddUserToMessage --project MyAiChatApp.Core --startup-project MyAiChatApp.Backend
2. dotnet ef migrations remove --project MyAiChatApp.Core --startup-project MyAiChatApp.Backend
3. dotnet ef database update --project MyAiChatApp.Core --startup-project MyAiChatApp.Backend

查看状态
systemctl status ollama

启动大模型
sudo systemctl start ollama

查看大模型
ollama list

查看谁跑的显存多
ollama ps

复制到liux
cp ollama-linux-amd64.tgz ~/

指定大模型路径
sudo ln -s /mnt/e/ollama/bin/ollama /usr/local/bin/ollamama

停止
sudo systemctl stop ollama


查看虚拟网络IP
ip addr | grep eth0


在 Windows 主机上设置端口转发

# 语法: netsh interface portproxy add v4tov4 listenport=[Windows要监听的端口] listenaddress=0.0.0.0 connectport=[WSL服务端口] connectaddress=[WSL的IP地址]

netsh interface portproxy add v4tov4 listenport=11434 listenaddress=0.0.0.0 connectport=11434 connectaddress=10.90.35.240


在 Windows 防火墙中添加入站规则

# 语法: New-NetFirewallRule -DisplayName "[规则名称]" -Direction Inbound -Action Allow -Protocol TCP -LocalPort [要开放的端口]

New-NetFirewallRule -DisplayName "Allow Ollama WSL Access" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434

查看是否成功
netsh interface portproxy show all


更改服务文件
sudo nano /etc/systemd/system/ollama.service

提醒Ollanma更新
sudo systemctl daemon-reload
sudo systemctl start ollama


MindMapEditor.vue 思维导图主页面
MindMapToolbar.vue 思维导入工具栏组件
FloatingNodeToolbar.vue 浮动节点工具栏组件
ContextMenu.vue 右键菜单栏页面
AIGenerationDialog.vue AI生成对话框组件

