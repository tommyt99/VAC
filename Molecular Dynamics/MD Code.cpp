#include <iostream>
#include <cmath>
#include <ctime>
#include <time.h>
using namespace std;

const int tmax = 10; 
const int npart = 125; 
const int n = cbrt(npart); 
int x[npart][3], xm[npart][3];
double v[npart][3], f[npart][3]; 
double sumv[3];
double sumv2; 
const double temp = 1; //What should this be set at? 
const double dt = 0.001;  //Spit out a file of xyz values every 200 
const double box = 6; 
double xr[3];
double en = 0;

int lattice_x(int i) {
	int x = i / (n*n);
	return x;
}
int lattice_y(int i) {
	int r = i % (n*n); 
	int y = r / n; 
	return y; 
}
int lattice_z(int i) {
	int r = i % (n*n);
	int rr = r % n; 
	int z = rr / 1; 
	return z; 
}
void init() {
	 sumv[0] = 0; 
	 sumv[1] = 0;
	 sumv[2] = 0; 
	 sumv2 = 0;
	for (int i = 0; i < npart; i++) {	
		x[i][0] = lattice_x(i); 		// place particles on a lattice
		x[i][1] = lattice_y(i);			//  | 
		x[i][2] = lattice_z(i);			//  |

		/*srand(time(NULL));*/
		v[i][0] = (double) rand() / RAND_MAX;
		v[i][1] = (double) rand() / RAND_MAX;
		v[i][2] = (double) rand() / RAND_MAX;

		sumv[0] += v[i][0]; 
		sumv[1] += v[i][1];
		sumv[2] += v[i][2]; 

		sumv2 += v[i][0]*v[i][0] + v[i][1]*v[i][1] + v[i][2]*v[i][2];
	}
	sumv[0] /= npart;
	sumv[1] /= npart;
	sumv[2] /= npart; 
	sumv2 /= npart;

	double fs = sqrt(3 * temp / sumv2); 
		for (int i = 0; i < npart; i++) {
			v[i][0] = (v[i][0] - sumv[0])*fs;
			v[i][1] = (v[i][1] - sumv[1])*fs;
			v[i][2] = (v[i][2] - sumv[2])*fs;
			xm[i][0] = x[i][0] - v[i][0] * dt; 
			xm[i][1] = x[i][1] - v[i][1] * dt;
			xm[i][2] = x[i][2] - v[i][2] * dt; 
		}
}

void force() {
	
	for (int i = 0; i < npart; i++) {
		f[i][0] = 0;
		f[i][1] = 0;
		f[i][2] = 0;
	}

	for (int i = 0; i < npart-1; i++) 
		for (int j = i+1; j < npart; j++) {
			double xr = x[i][0] - x[j][0];
			xr = xr - box * round(xr / box); 
			double yr = x[i][1] - x[j][1];
			yr = yr - box * round(yr / box);
			double zr = x[i][2] - x[j][2]; 
			zr = zr - box * round(zr / box);
			double r2 = xr * xr + yr * yr + zr * zr; 
			double rc = box / 2; 
			if (r2 < rc) { 
				double r2i = 1 / r2;
				double r6i = pow(r2i, 3);
				double ff = 48 * r2i*r6i*(r6i - 0.5);
			
				f[i][0] += ff * xr;
				f[j][0] -= ff * xr;
				f[i][1] += ff * yr; 
				f[j][1] -= ff * yr;
				f[i][2] += ff * zr; 
				f[j][2] -= ff * zr; 

				double r6c = pow(1 / rc, 6);
				double r12c = pow(r6c, 2);
				double ecut = 4 * (r12c - r6c); 
				en = en + 4 * r6i * (r6i - 1)- ecut; 
			}


		}
	

}



void integrate() {
	sumv[0] = 0;
	sumv[1] = 0;
	sumv[2] = 0;
	sumv2 = 0;
	for (int i = 0; i < npart; i++) {
		double xx = 2 * x[i][0] - xm[i][0] + dt*dt*f[i][0];
		double vx = (xx - xm[i][0]) / (2 * dt);
		sumv[0] += vx;
		double yy = 2 * x[i][1] - xm[i][1] + dt * dt*f[i][1]; 
		double vy = (yy - xm[i][1]) / (2 * dt);
		sumv[1] += vy;
		double zz = 2 * x[i][2] - xm[i][2] + dt * dt*f[i][2]; 
		double vz = (zz - xm[i][2]) / (2 * dt);
		sumv[2] += vz; 
		sumv2 += vx * vx + vy * vy + vz * vz; 
		xm[i][0] = x[i][0];
		x[i][0] = xx;
		xm[i][1] = x[i][1];
		x[i][1] = yy;
		xm[i][2] = x[i][2]; 
		x[i][2] = zz; 
	}
	double temp = sumv2 / (3 * npart); 
	double etot = (en + 0.5*sumv2) / npart;
	

}


int main() {
	init();
	int t = 0;
	int tmax = 10; 
	while (t<tmax) {
		force();
		integrate();
		t = t + dt;
		//sample();
	}


	return 0;
}