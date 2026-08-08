#include <iostream>
#include <vector>
#include <unordered_set>
#include <array>
#include <string>
#include <list>
#include <cmath>
#include <ctime>
#include <iomanip>
#include <fstream>

using namespace std;

int particle = 27; //Must be a number with an integer cube root
int cubeSize = 3; //cube root of particle
double box = 3; //cube root of particle
vector<double> Xpos;
vector<double> Ypos;
vector<double> Zpos;
vector<double> Xvel;
vector<double> Yvel;
vector<double> Zvel;
vector<double> Xm;
vector<double> Ym;
vector<double> Zm;
vector<double> Fx(particle);
vector<double> Fy(particle);
vector<double> Fz(particle);
double temp = 1;
double dt = 0.005;
double xr = 0;
double yr = 0;
double zr = 0;
double r2, r2i, r6i, ff;
double en = 0;
double epsilon = 1;
double sigma = 1;
double rc = 4 * sigma;
double rc2 = rc * rc;
double ecut = 4 * ( 1 / (pow(rc, 12)) - 1 / (pow(rc, 6)) );
double xx, yy, zz, vx, vy, vz, etot;
double kinetic;
void Initialization() {
	int line = cubeSize;
	int square = cubeSize * cubeSize;
	int number;
	double sumv = 0;
	double sumv2 = 0;
	for (int i = 0; i < particle; i++) {
		//Position
		number = i;
		Xpos.push_back(number / square);
		Ypos.push_back((number - square * (number/square))/ line);
		Zpos.push_back((number - line * (number / line)));
		//Velocity
		Xvel.push_back(((double)rand() / RAND_MAX - 0.5));
		Yvel.push_back(((double)rand() / RAND_MAX - 0.5));
		Zvel.push_back(((double)rand() / RAND_MAX - 0.5));
		sumv = sumv + Xvel[i] + Yvel[i] + Zvel[i];
		sumv2 = sumv2 + Xvel[i] * Xvel[i] + Yvel[i] * Yvel[i] + Zvel[i] * Zvel[i];
	}
	//Energy
	sumv = sumv / particle;
	sumv2 = sumv2 / particle;
	double fs = sqrt(3 * temp / sumv2);
	for (int i = 0; i < particle; i++) {
		Xvel[i] = (Xvel[i] - sumv) * fs;
		Yvel[i] = (Yvel[i] - sumv) * fs;
		Zvel[i] = (Zvel[i] - sumv) * fs;
		Xm.push_back(Xpos[i] - Xvel[i] * dt);
		Ym.push_back(Ypos[i] - Yvel[i] * dt);
		Zm.push_back(Zpos[i] - Zvel[i] * dt);
//		cout << "Xm " << Xm[i] << " " << Ym[i] << " " << Zm[i] << endl;
//		cout << "Pos " << Xpos[i] << " " << Ypos[i] << " " << Zpos[i] << endl;
	}
}
void InitialPrint() {
	for (int i = 0; i < particle; i++) {
		cout << "Pos: " << i << " is " << Xpos[i] << " " << Ypos[i] << " " << Zpos[i] << " Vel " << i << " is " << Xvel[i] << " " << Yvel[i] << " " << Zvel[i] << endl;
	}
}
void VelCheck() {
	double check = 0;
	for (int i = 0; i < particle; i++) {
		check = check + Xvel[i] * Xvel[i] + Yvel[i] * Yvel[i] + Zvel[i] * Zvel[i];
	}
	check = check / (3 * particle);
	cout << check << endl;
}
void Force() {
	en = 0;
	for (int i = 0; i < particle; i++) {
		Fx[i] = 0;
		Fy[i] = 0;
		Fz[i] = 0;
	}
	for (int i = 0; i < particle - 1; i++) {
		for (int j = i + 1; j < particle; j++) {
			xr = Xpos[i] - Xpos[j];
			yr = Ypos[i] - Ypos[j];
			zr = Zpos[i] - Zpos[j];
			xr = xr -  box * round(xr / box);
			yr = yr -  box * round(yr / box);
			zr = zr -  box * round(zr / box);
			r2 = xr * xr + yr * yr + zr * zr;
			if (r2 < rc2) {
				r2i = 1 / r2;
				r6i = r2i * r2i * r2i;
				ff = 48 * r2i * r6i * (r6i - 0.5);
				Fx[i] = Fx[i] + ff * xr;
				Fy[i] = Fy[i] + ff * yr;
				Fz[i] = Fz[i] + ff * zr;
				Fx[j] = Fx[j] - ff * xr;
				Fy[j] = Fy[j] - ff * yr;
				Fz[j] = Fz[j] - ff * zr;
				en = en + 4 * r6i * (r6i - 1) - ecut;
			}
		}
	}
//	cout << "Energy is " << en << endl;

}
void Integration() {
	double sumv = 0;
	double sumv2 = 0;
	for (int i = 0; i < particle; i++) {
		xx = (2 * Xpos[i]) - Xm[i] + (dt * dt * Fx[i]);
		yy = (2 * Ypos[i]) - Ym[i] + (dt * dt * Fy[i]);
		zz = (2 * Zpos[i]) - Zm[i] + (dt * dt * Fz[i]);
		vx = (xx - Xm[i]) / (2 * dt);
		vy = (yy - Ym[i]) / (2 * dt);
		vz = (zz - Zm[i]) / (2 * dt);
		sumv = sumv + vx + vy + vz; // I don't agree with this, fix later.
		sumv2 = sumv2 + (vx * vx) + (vy * vy) + (vz * vz);
		Xm[i] = Xpos[i];
		Ym[i] = Ypos[i];
		Zm[i] = Zpos[i];
		Xpos[i] = xx;
		Ypos[i] = yy;
		Zpos[i] = zz;
	}
	kinetic = sumv2;
	temp = sumv2 / (3 * particle);
	etot = (en + 0.5 * sumv2) / particle;
	
	for (int i = 0; i < particle; i++) {
		//Xpos[i] = Xpos[i] - box * round(Xpos[i] / box);
		//Ypos[i] = Ypos[i] - box * round(Ypos[i] / box);
		//Zpos[i] = Zpos[i] - box * round(Zpos[i] / box);		
		//Xm[i] = Xm[i] - box * round(Xm[i] / box);
		//Ym[i] = Ym[i] - box * round(Ym[i] / box);
		//Zm[i] = Zm[i] - box * round(Zm[i] / box);
		if (Xpos[i] >= box) {
			Xpos[i] = Xpos[i] - box;
			Xm[i] = Xm[i] - box;
		}
		if (Ypos[i] >= box) {
			Ypos[i] = Ypos[i] - box;
			Ym[i] = Ym[i] - box;
		}
		if (Zpos[i] >= box) {
			Zpos[i] = Zpos[i] - box;
			Zm[i] = Zm[i] - box;
		}
		if (Xpos[i] < 0) {
			Xpos[i] = Xpos[i] + box;
			Xm[i] = Xm[i] + box;
		}
		if (Ypos[i] < 0) {
			Ypos[i] = Ypos[i] + box;
			Ym[i] = Ym[i] + box;
		}
		if (Zpos[i] < 0) {
			Zpos[i] = Zpos[i] + box;
			Zm[i] = Zm[i] + box;
		}
	}
	//cout << "Temp is  " << temp << endl;

}

int main() {
//	setprecision(10);
	srand(time(0));

	Initialization();
//	InitialPrint();
	int t = 0;
	ofstream myfile;
	myfile.open("element.xyz");
	myfile << particle << endl;

	ofstream temperature;
	temperature.open("Temperature.txt");

	ofstream energy;
	energy.open("Energy.txt");

	cout << "Project done by Vinh Huynh " << endl;
	cout << "Important information:" << endl;
	cout << "The delta t is 0.005 which means every thousand iterations means 5 units of time have passed." << endl;
	cout << "The text files are being created on the whim so depending on the compiler, I do not know where they will be created for you. " << endl;
	cout << "Should there be an error, please adjust the directory where the files will be created." << endl;
	cout << "Three files are being printed: the positions (element.xyz), Temperature.txt, and Energy.txt." << endl;
	cout << "The columns for temperature are respectively: the time, temperataure" << endl;
	cout << "The columns for energy are respectively: the time, total energy, kinetic energy, potential energy" << endl;
	cout << "When opening the position file in VMD, please set the graphics to VDW and the size to be 0.2" << endl;
	cout << "This program shouldn't take longer than 55 minutes to finish. " << endl;
	cout << endl << "Calculating..." << endl;
	int tmax = 500000;
	int divide = tmax / 10;
	double time = 0;
	while(t <= tmax) {
		if (t % 1000 == 0) {
			for (int i = 0; i < particle; i++) {
				myfile << "ATOM" << i << " " << Xpos[i] << " " << Ypos[i] << " " << Zpos[i] << endl;

			}
			temperature << time << " " << temp << endl;
			energy << time << " " << etot << " " << kinetic << " " << en << endl;
//			cout << t << endl;
		}
	
		if (t % divide == 0 && t > 0) {
		cout << "Currently at: " << (double(t) / tmax) * 100 << "%" << endl;
		}
		t = t + 1;
		time = time + dt;
		Force();
		Integration();
	}
	myfile.close();
	temperature.close();
	energy.close();
	system("Pause");

	return 0;
}
