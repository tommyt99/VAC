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
const double dt = 0.01;  //What should this be set at? 
const int box = 6; 
double xr[3]; 

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
	double en = 0;
	for (int i = 0; i < npart; i++) {
		f[i][0] = 0;
		f[i][1] = 0;
		f[i][2] = 0;
	}

	for (int i = 0; i < npart-1; i++) 
		for (int j = i+1; j < npart; j++) {
			double xr = x[i][0] - x[j][0];
			double yr = x[i][1] - x[j][1];
			double zr = x[i][2] - x[j][2]; 
			xr = xr - box * round(xr/ box); 
			yr = yr - box * round(yr / box);
			zr = zr - box * round(zr / box);
			double x_r2 = xr * xr; 
			double y_r2 = yr * yr;
			double z_r2 = zr * zr; 
			if (x_r2 < 4 || y_r2 < 4 || z_r2 < 4) {
				double x_r2i = 1 / x_r2;
				double x_r6i = x_r2i * x_r2i * x_r2i;
				double ff_x = 48 * x_r2i*x_r6i*(x_r6i - 0.5);
				double y_r2i = 1 / y_r2;
				double y_r6i = y_r2i * y_r2i*y_r2i;
				double ff_y = 48 * y_r2i * y_r6i*(y_r6i - 0.5); 
				double z_r2i = 1 / z_r2; 
				double z_r6i = z_r2i * z_r2i*z_r2i;
				double ff_z = 48 * z_r2i * z_r6i*(z_r6i - 0.5);
				f[i][0] = f[i][0] + ff_x * xr;
				f[j][0] = f[j][0] - ff_x * xr;
				f[i][1] = f[i][1] + ff_y * yr; 
				f[j][1] = f[j][1] - ff_y * yr;
				f[i][2] = f[i][2] + ff_z * zr; 
				f[j][2] = f[j][2] - ff_z * zr; 
				double r6i = x_r6i * x_r6i + y_r6i * y_r6i + z_r6i * z_r6i; 
				en = en + 4 * r6i * (r6i - 1) - ecut; 
			}


		}
	

}



void integrate(f,en) {
	sumv = 0;
	sumv2 = 0;
	for (int i = 0; i < npart; i++) {
		double xx = 2 * x[i] - xm[i] + delt * delt*f[i];
		vi = (xx - xm[i]) / (2 * delt);
		sumv = sumv + vi;
		sumv2 = sumv2 + vi * vi; 
		xm[i] = x[i];
		x[i] = xx;
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
		/*integrate();
		t = t + dt;
		sample();*/
	}


	return 0;
}