#!/bin/bash

# 须在当前目录下运行
# `sudo xx.service.sh`安装服务；
# `sudo xx.service.sh remove`删除服务。
# `sudo xx.service.sh start|stop|restart|status`启停或查看状态。
# 服务命令会在当前目录下执行。

svc=`basename $0 .service.sh`
dir=`realpath .`
if [[ $UID != 0 ]]; then
	echo "*** Error: use root user or sudo"
	exit 1
fi

if [[ $1 == remove ]]; then
	systemctl stop $svc 2>/dev/null
	rm /usr/lib/systemd/system/$svc.service 2>/dev/null && echo "=== service $svc removed"
	exit
elif [[ -n $1 ]]; then
	systemctl $1 $svc
	exit
fi

cat <<. > /usr/lib/systemd/system/$svc.service
[Unit]
Description=$svc
After=syslog.target network.target auditd.service

[Service]
Type=simple
User=builder
ExecStart=/bin/sh -c "swoole $svc.php >> $svc.log 2>&1"
WorkingDirectory=$dir
Restart=on-failure
RestartSec=5s

# 避免systemd中SIGPIPE信号被忽略
IgnoreSIGPIPE=no

[Install]
WantedBy=multi-user.target

.

echo "=== install $svc"
systemctl enable $svc
systemctl daemon-reload

echo "=== restart $svc"
systemctl restart $svc
systemctl status $svc
