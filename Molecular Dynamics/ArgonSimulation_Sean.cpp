#include <iostream>
#include <ctime>
#include <random>
#include <math.h>
#include <fstream>
#include <string>
using namespace std;

#define N 27
#define n 3
#define L 3

double const dt = 0.0001;
double const rcut = 1.5;
double const temp = 1;
double etot = 0;
double en = 0;
string potential = "";
string kinetic = "";
string total = "";
string tempra = "";


class ArgonAtom{
public:
	double x, y, z, xm, ym, zm, vx, vy, vz, fx0, fy0, fz0, fx ,fy, fz;

	ArgonAtom() { }

	ArgonAtom(double X, double Y, double Z, double XM, double YM, double ZM, double VX, double VY, double VZ, double FX0, double FY0, double FZ0, double FX, double FY, double FZ) {
		x = X;
		y = Y;
		z = Z;
		xm = XM;
		ym = YM;
		zm = ZM;
		vx = VX;
		vy = VY;
		vz = VZ;
		fx0 = FX0;
		fy0 = FY0;
		fz0 = FZ0;
		fx = FX;
		fy = FY;
		fz = FZ;
	}
};

ArgonAtom sim[3][3][3];

void lennardForce() {
	en = 0;
	double rad, xmin, ymin, zmin, f;


	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				sim[r][c][s].fx = 0;
				sim[r][c][s].fy = 0;
				sim[r][c][s].fz = 0;
			}
		}
	}
	//calculation for forces between particles

	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				for (int r1 = r; r1 < n; r1++) {
					for (int c1 = c; c1 < n; c1++) {
						for (int s1 = s + 1; s1 < n; s1++) {


							xmin = ((sim[r][c][s].x - sim[r1][c1][s1].x) - L * round(((sim[r][c][s].x - sim[r1][c1][s1].x) / L)));
							ymin = ((sim[r][c][s].y - sim[r1][c1][s1].y) - L * round(((sim[r][c][s].y - sim[r1][c1][s1].y) / L)));
							zmin = ((sim[r][c][s].z - sim[r1][c1][s1].z) - L * round(((sim[r][c][s].z - sim[r1][c1][s1].z) / L)));


							rad = xmin * xmin + ymin * ymin + zmin * zmin;
							if (rad < rcut) {

								double r2i = 1 / rad;
								double r6i = r2i * r2i*r2i;
								double f = 48 * r2i*r6i*(r6i - 0.5);

								sim[r][c][s].fx += f * xmin;
								sim[r][c][s].fy += f * ymin;
								sim[r][c][s].fz += f * zmin;
								sim[r1][c1][s1].fx -= f * xmin;
								sim[r1][c1][s1].fy -= f * ymin;
								sim[r1][c1][s1].fz -= f * zmin;
								
								en += 4 * r6i*(r6i - 1);
								potential = potential + to_string(en) + "\n";
							}
						}
					}
				}
			}
		}
	}
}


void Integrate() {
	double sumvx = 0;
	double sumvy = 0;
	double sumvz = 0;
	double sumv2 = 0;
	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				double xm = sim[r][c][s].x;
				double ym = sim[r][c][s].y;
				double zm = sim[r][c][s].z;
				sim[r][c][s].x = (2 * sim[r][c][s].x) - sim[r][c][s].xm + (dt*dt*sim[r][c][s].fx);
				sim[r][c][s].y = (2 * sim[r][c][s].y) - sim[r][c][s].ym + (dt*dt*sim[r][c][s].fy);
				sim[r][c][s].z = (2 * sim[r][c][s].z) - sim[r][c][s].zm + (dt*dt*sim[r][c][s].fz);

				sim[r][c][s].vx = (sim[r][c][s].x - sim[r][c][s].xm) / (2 * dt);
				sim[r][c][s].vy = (sim[r][c][s].y - sim[r][c][s].ym) / (2 * dt);
				sim[r][c][s].vz = (sim[r][c][s].z - sim[r][c][s].zm) / (2 * dt);
				sumvx += sim[r][c][s].vx * sim[r][c][s].vx;
				sumvy += sim[r][c][s].vy * sim[r][c][s].vy;
				sumvz += sim[r][c][s].vz * sim[r][c][s].vz;

				sim[r][c][s].xm = xm;
				sim[r][c][s].ym = ym;
				sim[r][c][s].zm = zm;
			}
		}
	}
	sumv2 = sumvx + sumvy + sumvz;
	kinetic = kinetic + to_string(sumv2) + "\n";
	etot = (en + .5*sumv2) / N;
	total = total + to_string(etot) + "\n";


	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				if (sim[r][c][s].x > L)
					sim[r][c][s].x = sim[r][c][s].x - L;
				if (sim[r][c][s].x < 0)
					sim[r][c][s].x = sim[r][c][s].x + L;
				if (sim[r][c][s].y > L)
					sim[r][c][s].y = sim[r][c][s].y - L;
				if (sim[r][c][s].y < 0)
					sim[r][c][s].y = sim[r][c][s].y + L;
				if (sim[r][c][s].z > L)
					sim[r][c][s].z = sim[r][c][s].z - L;
				if (sim[r][c][s].z < 0)
					sim[r][c][s].z = sim[r][c][s].z + L;
			}
		}
	}
	lennardForce();
}

double temperature() {

		double v2 = 0.;
		for (int r = 0; r < n; r++) {
			for (int c = 0; c < n; c++) {
				for (int s = 0; s < n; s++) {
					v2 += (sim[r][c][s].vx * sim[r][c][s].vx) + (sim[r][c][s].vy * sim[r][c][s].vy) + (sim[r][c][s].vz * sim[r][c][s].vz);
				}
			}
		}
		return ( v2 / (3 * N ) );

}

void init() {
	//initilization
	double sumvx = 0, sumvy = 0, sumvz = 0, sumvx2 = 0, sumvy2 = 0, sumvz2 = 0, sumv2 = 0;
	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				sim[r][c][s] = ArgonAtom(r, c, s, 0, 0, 0, ((rand() % 100)*.01) - .5, ((rand() % 100)*.01) - .5, ((rand() % 100)*.01) - .5, 0, 0, 0, 0, 0, 0);
				sumvx += sim[r][c][s].vx;
				sumvy += sim[r][c][s].vy;
				sumvz += sim[r][c][s].vz;
				sumvx2 += sim[r][c][s].vx * sim[r][c][s].vx;
				sumvy2 += sim[r][c][s].vy * sim[r][c][s].vy;
				sumvz2 += sim[r][c][s].vz * sim[r][c][s].vz;
				sumv2 += sumvx2 + sumvy2 + sumvz2;

			}
		}
	}
	sumvx /= N;
	sumvy /= N;
	sumvz /= N;
	double fs = sqrt(3*(temp) / sumv2);
	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				sim[r][c][s].vx = (sim[r][c][s].vx - sumvx)*fs;
				sim[r][c][s].vy = (sim[r][c][s].vy - sumvy)*fs;
				sim[r][c][s].vz = (sim[r][c][s].vz - sumvz)*fs;
				sim[r][c][s].xm = sim[r][c][s].x - sim[r][c][s].vx*dt;
				sim[r][c][s].ym = sim[r][c][s].y - sim[r][c][s].vy*dt;
				sim[r][c][s].zm = sim[r][c][s].z - sim[r][c][s].vz*dt;
			}
		}
	}
	lennardForce();
}

int main() {
	srand(time(0));
	init();
	int i = 0;
	ofstream myfile;
	string path = "C:/Users/Sean/Documents/GitHub/VAC/C++/C++/Project1/ArgonSimulationOutput/file_";
	path += to_string(i);
	path += ".xyz";
	myfile.open(path);
	myfile << "216\n";
	myfile << " \n";
	for (int r = 0; r < n; r++) {
		for (int c = 0; c < n; c++) {
			for (int s = 0; s < n; s++) {
				myfile << "ATOM" << r * n*n + c * n + s << "     " << sim[r][c][s].x << "   " << sim[r][c][s].y << "   " << sim[r][c][s].z << "\n";
			}
		}
	}
	myfile.close();
	i++;
	for (int k = 1; k<1000; k++) {
		
		if (k % 10 == 0) {
			printf("\t %f percent\n", ((double)k / 1000)*100.0);  
			cout << "Temperature: " << temperature() << endl;
			ofstream myfile;
			string path = "C:/Users/Sean/Documents/GitHub/VAC/C++/C++/Project1/ArgonSimulationOutput/file_";
			path += to_string(i);
			path += ".xyz";
			myfile.open(path);
			myfile << "216\n";
			myfile << " \n";
			for (int r = 0; r < n; r++) {
				for (int c = 0; c < n; c++) {
					for (int s = 0; s < n; s++) {
						myfile << "ATOM" << r * n*n + c * n + s << "     " << sim[r][c][s].x << "   " << sim[r][c][s].y << "   " << sim[r][c][s].z << "\n";
					}
				}
			}
			myfile.close();
			i++;
		}
		
	
	
		Integrate();
		tempra = tempra + to_string(temperature()) + "\n";


	}

	myfile.open("kinetic.txt");
	myfile << kinetic;
	myfile.close();

	myfile.open("potential.txt");
	myfile << potential;
	myfile.close();

	myfile.open("total.txt");
	myfile << total;
	myfile.close();

	myfile.open("temperature.txt");
	myfile << tempra;
	myfile.close();
	
	system("PAUSE");
	return 0;
}