% Simple Harmonic Oscillator

clear;
clc;
close all;

t = 0;
period = pi;

x = 1;
vx = 0;

h = 10^-3;
k=1;

x_position = [x];
time = [t];

while( t<period )
    
    ax = (-(k^2))*x;
    x = x+((1/2)*((vx)+(vx+(h*(ax)))))*h; %Look at how to derive this again. 
    axs = (-(k^2))*x; % This could be ax star, double check 
    vx = vx+((1/2)*(ax+axs))*h;

    x_position = [x_position,x]; 
    t = t+h;
    time = [time,t];
    
    
end

figure()
plot(time,x_position)
xlabel ('Time [t]') 
ylabel ('Position [x]')

