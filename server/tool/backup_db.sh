#!/bin/sh

# 注意：
# 以用户xeycro为例，必须有以下权限：
# grant select, lock tables, show view on carsvc.* to xeycro;
# grant select on mysql.* to xeycro;
# grant reload, replication client, replication slave on *.* to xeycro;

# 如果报错：mysqldump: Error: Binlogging on server not active
# 需要在my.cnf中[mysqld]段中添加以下配置，并重启mysql服务
#	log_bin=mysql-bin
#	log-bin-trust-function-creators=1 # 避免DETERMINISTIC function之类的错误

dbuser=xeycro
dbpwd=xeyc2014
db=carsvc

bak=bak/db_`date +%Y%m%d_%H%M%S`.gz

mysqldump -u$dbuser -p$dbpwd --routines $db --master-data=2 --ignore-table=${db}.ApiLog --ignore-table=${db}.ApiLog1 --ignore-table=${db}.Syslog --ignore-table=${db}.ObjLog | gzip > $bak

echo "=== db backup to file '$bak'"

cd bak
for f in db_*.gz ; do
	if [[ $f < db_`date -d '-10 day' +%Y%m%d`.gz ]]; then
		rm -f $f
	fi
done

