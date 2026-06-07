---
created: 2024-11-17T20:57:23+08:00
modified: 2025-09-18T09:27:31+08:00
published: 2024-11-17T20:57:23+08:00
---

```shell
function cmt(){
        git commit -am "$1"
}

function cr(){
        b=`git branch --show-current`
        git push origin head:refs/for/${b} -o reviewer=11
}

function amend(){
        git add .
        git commit --amend
}

function cur(){
        git branch --show-current
}

function pull(){
		git pull --rebase
        b=`git branch --show-current`
        git checkout master
        git pull
        git checkout ${b}
        git merge master
}
```