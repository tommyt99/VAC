clc
clear
close all

%Time incrementation
T=20;       %Time elapsed
n=1000;  %Number of iterations
dt=T/n;

%Initial Values
x(1)=1;
y(1)=0;
v(1)=0;
w(1)=.98;

for N=1:n-1
xs = x(N)+v(N)*(dt);
vs = v(N)+(-x(N)/((x(N)^2)+(y(N)^2)))*dt;
ys = y(N)+w(N)*(dt);
ws = w(N)+(-y(N)/((x(N)^2)+(y(N)^2)))*dt; 
x(N+1) = x(N)+0.5*(v(N)+vs)*dt;
v(N+1) = v(N)+0.5*((-x(N)/((x(N)^2)+(y(N)^2)))+(-xs/((xs^2)+(ys^2))))*dt;
y(N+1) = y(N)+0.5*(w(N)+ws)*dt;
w(N+1) = w(N)+0.5*((-y(N)/((x(N)^2)+(y(N)^2)))+(-ys/((xs^2)+(ys^2))))*dt;
end

plot([0],[0],'*','MarkerSize',10)
hold on
plot(x,y)


