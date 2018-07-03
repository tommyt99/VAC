clear
clc
close all


G=-6.67*10^-11;
t=365*24*60*60;
masssun = 1.989*10^30;

vx = [1:100];
vx(:)=1;
vy = [1:100];
vy(:)=1;
px = [1:100];
px(:)=1;
py = [1:100];
py(:)=1;
deltat=t/432;
c=432;

px(1)=1.52*10^11;
py(1)=0;
vx(1)=0;
vy(1)=29300;

for i=1:1:deltat
    ax=G*masssun*px(i)/(px(i)^2+py(i)^2)^(3/2);
    ay=G*masssun*py(i)/(px(i)^2+py(i)^2)^(3/2);
    
    pxstar=px(i)+vx(i)*c;
    pystar=py(i)+vy(i)*c;
    vxstar=vx(i)+ax*c;
    vystar=vy(i)+ay*c;
    
    axs=G*masssun*pxstar/((pxstar^2+pystar^2)^(3/2));
    ays=G*masssun*pystar/((pxstar^2+pystar^2)^(3/2));
    

    vx(i+1)=vx(i)+(ax+axs)*c*.5;
    vy(i+1)=vy(i)+(ay+ays)*c*.5;
    px(i+1)=px(i)+(vx(i)+vx(i+1))*c*.5;
    py(i+1)=py(i)+(vy(i)+vy(i+1))*c*.5;
end

hold on;
scatter(0,0);
plot(px,py);