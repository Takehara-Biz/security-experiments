#!/bin/sh
# echo;はただの改行。
echo "no auth info";
curl -v server:3000; echo;echo;
echo "incorrect username and password";
curl -v -u wrong-username:wrong-password server:3000; echo;echo;
echo "correct username and password";
curl -v -u user1:pass1 server:3000; echo;echo;