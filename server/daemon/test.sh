#!/bin/sh
#curl 'localhost/jdcloud/api/hello?id=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost/jdcloud/api/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/hello?a=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost:8081/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
curl 'localhost:8081/Test.hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
