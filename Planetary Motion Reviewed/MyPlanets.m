clear;
clc;
close all;

G = -6.67*10^-11 ; 
m_sun = 1.989*10^30; 

% x(1) = 1.521*10^11;
x(1) = 1*10^11;
y(1) = 0;
vx(1) = 0;
vy(1) = 29300;

T = 365*24*60*60;
N = 365;
h = T/N * 0.05;
time = 0; 
n = 1 ; 

while (time < T)
    ax = G*m_sun*x(n)/(x(n)^2 + y(n)^2)^(3/2);
    ay = G*m_sun*y(n)/(x(n)^2 + y(n)^2)^(3/2);
    xs = x(n)+vx(n)*h;
    ys = y(n)+vy(n)*h;
    vxs = vx(n) + ax*h;
    vys = vy(n) + ay*h;
    axs = (G*m_sun*xs)/((xs^2 + ys^2)^(3/2));
    ays = (G*m_sun*ys)/((xs^2 + ys^2)^(3/2));
    vx(n+1) = vx(n) + 0.5*(ax + axs)*h;
    vy(n+1) = vy(n) + 0.5*(ay + ays)*h;
    x(n+1) = x(n) + 0.5*(vx(n) + vxs)*h;
    y(n+1) = y(n) + 0.5*(vy(n) + vys)*h;
    n = n + 1 ; 
    time = time + h; 
end

plot([0],[0],'*','MarkerSize',10)
hold on
plot(x,y)







% clear;
% clc;
% close all;
% 
% % Constants
% G = 6.67408*10^-11 ; 
% M_sun = 1.989*10^30 ; 
% T = 365*24*60*60; %This is time (1 year in seconds)
% N = 10000000; %increments or iterations
% h = T/N;    % h is delta t
%  
% x_position =[]; %Initiating values  
% y_position = []; 
% vx_vector =[];
% vy_vector =[];
% x_n = 1; %Initial conditions
% y_n = 0; 
% vx_n = 0;
% vy_n = 1000000;
% counter =0;
% 
% for  t = 1:h:T % or (1:N) This iterates N times.
% counter = counter +1; 
% 
% x_position(counter) = x_n;
% y_position(counter) = y_n; 
% 
% vx_vector(counter) = vx_n;
% vy_vector(counter) = vy_n; 
% 
% 
% 
% %Calculations
% ax_n = (-1*G*M_sun*x_n)/(x_n^2 + y_n^2)^(3/2); 
% ay_n = (-1*G*M_sun*y_n)/(x_n^2 + y_n^2)^(3/2); 
% 
% 
% x_s = x_n + vx_n*h; 
% y_s = y_n + vy_n*h; 
%  
% 
% vx_s = vx_n + ax_n*h; 
% vy_s = vy_n + ay_n*h;
% 
% ax_s = (-1*G*M_sun*x_s)/(x_s^2 + y_s^2)^(3/2);
% ay_s = (-1*G*M_sun*y_s)/(x_s^2 + y_s^2)^(3/2);
% 
% x_np1 = x_n + 0.5*(vx_n + vx_s)*h;
% y_np1 = y_n + 0.5*(vy_n + vy_s)*h; 
% 
% 
% vx_np1 = vx_n + 0.5*(ax_n + ax_s)*h;
% vy_np1 = vy_n + 0.5*(ay_n + ay_s)*h; 
% 
% 
% %Re-initializing for next iteration of loop
% x_n = x_np1;
% y_n = y_np1; 
% 
% vx_n = vx_np1;
% vy_n = vy_np1; 
% 
% 
% end
% 
% plot(x_position, y_position, 'ok')



