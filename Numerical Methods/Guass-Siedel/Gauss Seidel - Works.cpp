// Gauss Seidel Method
#include <iostream>
#include <math.h>
using namespace std;

int main()
{
	const int n = 3;
	double a[n][n] = {
	{ 3,-.1,-.2 },
	{ .1, 7, -.3 },
	{ .3,-.2,10 } };
	double b[n] = { 7.85,-19.3,71.4 };
	double error = 1;
	double EPSILON = pow(10, -6);
	double x[3] = { 1,1,1 };
	double x_new[3] = { 0,0,0 };
	double lambda = 1.50; 
	int iteration = 0; 

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
			x_new[i] = (b[i] - x_new[i]) / a[i][i];	// code before adding lambda
			error += abs(x_new[i] - x[i]);
			x[i] = x_new[i];
			/*x_new[i+1] =   x_new[i] + (lambda/a[i][i]) * (b[i] - a[i][i]*x_new[i] - a[i][i]*x_new[i] );
			error += abs(x_new[i+1] - x_new[i]);*/
			
		}
	}
	for (int i = 0; i < n; i++)
	{
		cout << "x" << i + 1 << "= " << x[i] << endl;
	}
	system("PAUSE");
	return 0;
}
