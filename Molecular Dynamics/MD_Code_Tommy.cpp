#include <iostream>
#include <cmath>
#include <ctime>
#include <time.h>
#include <fstream>

using namespace std;

const int tmax = 10; 
const int n = 5;
const int npart = n*n*n; 
double x[npart][3], xm[npart][3];
double v[npart][3], f[npart][3]; 
double sumv[3];
double sumv2; 
double temp =1; 
const double dt = 0.005; 
const double box = n+2; 
double xr[3];
double en;
double etot; 
double ecut;
double rc = box / 2;

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
	en = 0; 
	double xr, yr, zr, r2, r2i, r6i, ff;
	for (int i = 0; i < npart; i++) {
		f[i][0] = 0;
		f[i][1] = 0;
		f[i][2] = 0;
	}
	for (int i = 0; i < npart-1; i++) //Periodic Boundary Condition
		for (int j = i+1; j < npart; j++) {
			xr = x[i][0] - x[j][0];
			xr = xr - (box * round(xr / box)); 
			yr = x[i][1] - x[j][1];
			yr = yr - (box * round(yr / box));
			zr = x[i][2] - x[j][2]; 
			zr = zr - (box * round(zr / box));
			r2 = xr*xr + yr*yr + zr*zr; 

			if (r2 < rc*rc) { 
				r2i = 1 / r2;
				r6i = pow(r2i, 3);
				ff = 48 * r2i*r6i*(r6i - 0.5);
			
				f[i][0] += ff * xr;
				f[j][0] -= ff * xr;
				f[i][1] += ff * yr; 
				f[j][1] -= ff * yr;
				f[i][2] += ff * zr; 
				f[j][2] -= ff * zr; 

				en = en + 4 * r6i * (r6i - 1)- ecut; //potential energy
			}
		}
}



void integrate() {
	sumv[0] = 0;
	sumv[1] = 0;
	sumv[2] = 0;
	sumv2 = 0;
	etot = 0;
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
	temp = sumv2 / (3 * npart); 
	etot = (en + 0.5*sumv2) / npart;

	//for (int i = 0; i < npart; i++) { //wall
	//	if (x[i][0] > box) {
	//		x[i][0] = x[i][0] - box;
	//		xm[i][0] = xm[i][0] - box;
	//	}
	//	if (x[i][1] > box) {
	//		x[i][1] = x[i][1] - box;
	//		xm[i][1] = xm[i][1] - box;
	//	}
	//	if (x[i][2] > box) {
	//		x[i][2] = x[i][2] - box;
	//		xm[i][2] = xm[i][2] - box;
	//	}
	//	if (x[i][0] < 0) {
	//		x[i][0] = x[i][0] + box;
	//		xm[i][0] = xm[i][0] + box;
	//	}
	//	if (x[i][1] < 0) {
	//		x[i][1] = x[i][1] + box;
	//		xm[i][1] = xm[i][1] + box;
	//	}
	//	if (x[i][2] < 0) {
	//		x[i][2] = x[i][2] + box;
	//		xm[i][2] = xm[i][2] + box;
	//	}
	//}
}


int main() {

	init();
	double t = 0;
	int counter = 0; 
	int timestep = 0; 
	double r6c = pow(1 / rc, 6);
	double r12c = pow(r6c, 2);
	ecut = 4 * (r12c - r6c);

	ofstream myfile;
	myfile.open("data.txt");
	myfile << "Iteration: " << "	 " << "Energy per particle: " << "		 " << "Temp:" << "			 " << "PE per particle:" << endl;
	
	ofstream positions("positions.xyz");
	positions << npart << endl; 
	
	ofstream velocity("velocity.txt");
	velocity << "Velocity of center of mass." << endl;
	velocity << "Velocity in x:" << " " << "Velocity in y:" << " " << "Velocity in z:" << " " << endl; 

	while (t<tmax) {
		counter += 1; 
		timestep += 1; 
		force();
		integrate();
		t = t + dt;
		if (timestep == 10) { // data of xyz coordinates for all particles every 1000 steps. 
			timestep = 0;
			myfile << counter << "   		  " << etot << "		 " << temp << "		" << en / npart << endl;
			for (int i = 0; i < npart; i++) {
				positions << "ATOM" << i << " " << x[i][0] << "  " << x[i][1] << "  " << x[i][2] << endl; 
			} 
		}
		velocity << sumv[0] << " " << sumv[1] << " " << sumv[2] << "	" << "Magnitude: " << (sumv[0] * sumv[0]) + (sumv[1] * sumv[1]) + (sumv[2] * sumv[2]) << endl;
	}
	myfile.close();
	positions.close();
	velocity.close();
	return 0;
}