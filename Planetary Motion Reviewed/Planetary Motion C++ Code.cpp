//
//  main.cpp
//  Planetary Motion
//
//  Created by Surbhi Gupta on 6/25/18.
//  Copyright © 2018 Surbhi Gupta. All rights reserved.
//

#include <iostream>
#include <cmath>
#include <fstream>
using namespace std;

double G = 6.674 * pow(10,-11);
double Ms = 1.989 * pow(10,30);
double radius = 1.521 * pow(10,11);

int main()
{
    ofstream fileX ("outputX");
    ofstream fileY ("outputY");
    double x=radius, xstar, y=0, y1[80000], x1[80000], ystar, vx=0, vy=29300, vx1=0, vy1=0, v=0, v1, vstarX, vstarY, time=0, h=86400*.005, n=31557000; //n=#of sec/year
    x1[0]=x;
    y1[0]=y;
    
    long count=0;
    while(time<n)
    {
        
        //1st step
        xstar = x+h*vx;
        ystar = y+h*vy;
        //2nd step
        vstarX = vx-((G*Ms*h*x)/(pow(x*x+y*y,1.5)));
        vstarY = vy-((G*Ms*h*y)/(pow(x*x+y*y,1.5)));
        x=x+(0.5)*(vx+vstarX)*h;
        y=y+(0.5)*(vy+vstarY)*h;
        vx=vx-(0.5*G*Ms*h)*(((x)/(pow(x*x+y*y,1.5)))+((xstar)/(pow(xstar*xstar+ystar*ystar,1.5))));
        vy=vy-(0.5*G*Ms*h)*(((y)/(pow(x*x+y*y,1.5)))+((ystar)/(pow(xstar*xstar+ystar*ystar,1.5))));
        x1[count]=x;
        y1[count]=y;
        
        fileX <<x1[count] << endl;
        fileY <<y1[count] << endl;
        
        cout << "x value: " << x1[count] << endl;
        cout << "y value: " << y1[count] << endl << endl;
        
        count++;
        time+=h;
       
    }
    fileX.close();
    fileY.close();
    return 0;
}




