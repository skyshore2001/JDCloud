#!/bin/sh
#curl 'localhost/jdcloud/api/hello?id=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost/jdcloud/api/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/hello?a=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost:8081/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/Test.hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@

# 取websocket在线用户数
#curl 'localhost:8081/getUsers?app=app1'
# 推送消息
#curl 'localhost:8081/push?app=app1&user=*' -d 'msg=hello'
# HTTP长轮询方式(comit)等待接收消息
#curl 'localhost:8081/getMsg?app=app1&user=store1&timeout=5'

# 添加一次性延迟任务
#curl 'localhost:8081/setTimeout' -H 'content-type: application/json' \
#	-d '{"wait":3000, "url":"http://oliveche.com/echo.php?a=1&b=2", "useJson":1, "headers": ["x-hello: world"], "data": "[10,20]"}'

# 添加定时轮询任务
#curl 'localhost:8081/setTimeout' -H 'content-type: application/json' \
#	-d '{"wait":3000, "url":"http://oliveche.com/echo.php?a=1&b=2", "cron":1}'

# 添加定时轮询任务 unix crontab风格
#curl 'localhost:8081/setTimeout' -H 'content-type: application/json' \
#	-d '{"url":"http://oliveche.com/echo.php?a=1&b=2", "wait":5000, "cron":"9 0 * * *"}'

# 修改轮询任务disable/enable/del/query，可以用id或code访问
#curl 'localhost:8081/Timer/7/disable' 
#curl 'localhost:8081/Timer/7/set' -d 'cron=52 12 * * *' -d 'code=app1-task-101'
#curl 'localhost:8081/Timer/7/del' 
#curl 'localhost:8081/Timer/enable?code=app1-task-101'
curl 'localhost:8081/Timer/query' 

