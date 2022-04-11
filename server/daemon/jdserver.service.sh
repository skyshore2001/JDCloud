#!/bin/sh

svc=`basename $0 .service.sh`
dir=`realpath .`
if [[ $UID != 0 ]]; then
	echo "*** Error: use root user or sudo"
	exit 1
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

[Install]
WantedBy=multi-user.target

.

echo "=== install $svc"
systemctl enable $svc
systemctl daemon-reload

echo "=== restart $svc"
systemctl restart $svc
systemctl status $svc
