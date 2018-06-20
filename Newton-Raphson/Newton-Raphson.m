clear;
clc;
close all;

% Newton-Raphson Method
% f(x) = x^2 + 1


xn=1;
error = 0.0000001; %percent
counter =0; 
while (true)
xp=xn;
counter = counter +1; 
xn = (xn-(cos(xn)-xn)/(-1*sin(xn)-1)) ; 
h = xn-xp;
h_vector(1,counter) = h ; 
error_new = abs( (xn-xp)/xn ) * 100  ; 
error_vector(1,counter) = error_new; 
if error_new < error 
    break
end

end

fprintf('This is the root for cos(x) - x. : %d', xn) 
x = log(1./h_vector) ;
y = log(error_vector); 
figure()
plot(x,y)
xlabel('log(1/h)')
ylabel('log(error)')
title('cos(x) -x')


xn = 1 ; 
error = 0.00000001;
counter =0; 
h_vector= []; 
error_vector = []; 
while (true) 
    xp = xn;
    counter = counter +1; 
  xn =   xn - ((exp(-xn) - xn) / (-exp(-xn) -1));
    h = xn-xp;
    h_vector(1,counter) = h ; 
  
  error_new = abs( (xn-xp)/xn )  ;
  error_vector(1,counter) = error_new; 
    if error_new < error 
        break

    end
  
end

fprintf('\nThis is the root for e^-x - x : %d ', xn) 
x = log(1./h_vector) ;
y = log(error_vector); 
figure()
plot(x,y)
xlabel('log(1/h)')
ylabel('log(error)')
title('e^-x -x ') 

