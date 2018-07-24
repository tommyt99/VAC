//Helmholtz Equation

#include<iostream>

using namespace std;





double f(double x) {
	double res = x; 
	return res;
}



int main() {
	const int n = 3;
	
	double L = 12;
	double h = L / n;
	double A = 0;
	double B = 10;
	double b[n];
	double error = 1;
	double EPSILON = pow(10, -6);
	double x[n] = { 1,1,1 };
	double x_new[n] = { 0,0,0 };
	double lambda = 1; // Lambda between 1 and 2 
	int iteration = 0;
	double a[n][n] =
	{ { -1 * (2 + lambda * h*h),1,0 },
	{ 1, -1 * (2 + lambda * h*h), 1 },
	{ 0, 1,-1 * (2 + lambda * h*h) } };

	int p = 0; 
	for (int x = 0; x < n; x++) {
		if (p == 0) {
			b[p] = h * h*f(x) - A;
		}
		else if (p == n - 1) {
			b[p] = h * h*f(x) - B;
		}
		else
			b[p] = h * h*f(x); 
			p++;
	}



	while (error / 3 > EPSILON)
	{
		iteration += 1;
		error = 0;
		for (int i = 0; i < n; i++)
		{
			x_new[i] = 0;
			for (int j = 0; j < n; j++)
			{
				if (i != j)
				{
					x_new[i] += a[i][j] * x[j];
				}
			}
			x_new[i] = ((b[i] - x_new[i]) / a[i][i]); //(This is before adding SOR)
			//x_new[i] = ((b[i] - x_new[i]) / a[i][i]) * (lambda + (1 - lambda) * x[i]);
			error += abs(x_new[i] - x[i]);
			x[i] = x_new[i];
		}
	}



	for (int i = 0; i < n; i++)
	{
		cout << "x" << i + 1 << "= " << x[i] << endl;
	}

	cout << iteration << endl;

	system("PAUSE");



	return 0;
}