#!/bin/sh
#curl 'localhost/jdcloud/api/hello?id=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost/jdcloud/api/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/hello?a=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost:8081/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/Test.hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@

# ȡwebsocket�����û���
#curl 'localhost:8081/getUsers?app=app1'
# ������Ϣ
#curl 'localhost:8081/push?app=app1&user=*' -d 'msg=hello'
# HTTP����ѯ��ʽ(comit)�ȴ�������Ϣ
#curl 'localhost:8081/getMsg?app=app1&user=store1&timeout=5'

# ���һ�����ӳ�����
#curl 'localhost:8081/setTimeout' -H 'content-type: application/json' \
#	-d '{"wait":3000, "url":"http://oliveche.com/echo.php?a=1&b=2", "useJson":1, "headers": ["x-hello: world"], "data": "[10,20]"}'

# ��Ӷ�ʱ��ѯ����
#curl 'localhost:8081/setTimeout' -H 'content-type: application/json' \
#	-d '{"wait":3000, "url":"http://oliveche.com/echo.php?a=1&b=2", "cron":1}'

# ��ѯ����disable/enable/del/query
#curl 'localhost:8081/Timer/7/disable' 
#curl 'localhost:8081/Timer/3/enable' 
#curl 'localhost:8081/Timer/7/del' 
curl 'localhost:8081/Timer/query' 

