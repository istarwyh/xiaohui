---
created: 2024-11-17T20:57:23+08:00
modified: 2026-05-13T08:48:02+08:00
published: 2024-11-17T20:57:23+08:00
---

https://github.com/termux/termux-app#installation
termux-setup-storage
ssh github repository
pkg install vim
pkg install git

vim ~/.bashrc  
alias c="cd ~/storage/downloads/xiaohui/content"
alias p="git commit -am 'from phone' && git push"
source ~/.bashrc
git config --global --add safe.directory /storage/emulated/0/Download/Xiaohui
git config --global user.email "yihui-wang@qq.com"
git config --global user.name "istarwyh"
检查是否生效git config -l

#Command