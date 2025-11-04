from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.models import (
    TestExecution, TestCase, Module, Release, User, TestStatus, JiraDefect
)
from app.schemas.schemas import ReleaseReport, ModuleTestReport
from app.api.auth import get_current_active_user
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

router = APIRouter()

@router.get("/release/{release_id}", response_model=ReleaseReport)
def get_release_report(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate release test report data"""
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Get all modules
    modules = db.query(Module).all()
    
    # Get all test cases for this release
    executions = db.query(TestExecution).filter(
        TestExecution.release_id == release_id
    ).all()
    
    # Calculate module-wise statistics
    module_reports = []
    total_executed = 0
    total_passed = 0
    total_failed = 0
    total_pending = 0
    total_skipped = 0
    modules_tested = 0
    
    for module in modules:
        module_test_cases = db.query(TestCase).filter(TestCase.module_id == module.id).all()
        module_executions = [e for e in executions if e.test_case.module_id == module.id]
        
        total_tests = len(module_test_cases)
        passed = len([e for e in module_executions if e.status == TestStatus.PASS])
        failed = len([e for e in module_executions if e.status == TestStatus.FAIL])
        pending = len([e for e in module_executions if e.status == TestStatus.PENDING])
        skipped = len([e for e in module_executions if e.status == TestStatus.SKIPPED])
        
        pass_percentage = (passed / total_tests * 100) if total_tests > 0 else 0
        
        if len(module_executions) > 0:
            modules_tested += 1
        
        total_executed += len(module_executions)
        total_passed += passed
        total_failed += failed
        total_pending += pending
        total_skipped += skipped
        
        module_reports.append(ModuleTestReport(
            module_name=module.name,
            total_tests=total_tests,
            passed=passed,
            failed=failed,
            pending=pending,
            skipped=skipped,
            pass_percentage=round(pass_percentage, 2)
        ))
    
    total_test_cases = db.query(TestCase).count()
    overall_pass_percentage = (total_passed / total_executed * 100) if total_executed > 0 else 0
    
    return ReleaseReport(
        release_version=release.version,
        release_name=release.name,
        total_modules=len(modules),
        modules_tested=modules_tested,
        modules_not_tested=len(modules) - modules_tested,
        total_test_cases=total_test_cases,
        executed_test_cases=total_executed,
        passed=total_passed,
        failed=total_failed,
        pending=total_pending,
        skipped=total_skipped,
        pass_percentage=round(overall_pass_percentage, 2),
        module_reports=module_reports,
        generated_at=datetime.utcnow()
    )

@router.get("/pdf/{release_id}")
def generate_pdf_report(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate and download PDF report for a release"""
    report_data = get_release_report(release_id, db, current_user)
    
    # Create reports directory if it doesn't exist
    os.makedirs("reports", exist_ok=True)
    
    filename = f"reports/release_{report_data.release_version}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    # Create PDF
    doc = SimpleDocTemplate(filename, pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    # Title
    elements.append(Paragraph(f"Test Report - Release {report_data.release_version}", title_style))
    elements.append(Spacer(1, 12))
    
    # Release Information
    elements.append(Paragraph("Release Information", heading_style))
    release_info = [
        ["Release Version:", report_data.release_version],
        ["Release Name:", report_data.release_name or "N/A"],
        ["Report Generated:", report_data.generated_at.strftime("%Y-%m-%d %H:%M:%S")],
        ["Generated By:", current_user.full_name or current_user.email]
    ]
    release_table = Table(release_info, colWidths=[2*inch, 4*inch])
    release_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    elements.append(release_table)
    elements.append(Spacer(1, 20))
    
    # Summary Statistics
    elements.append(Paragraph("Overall Summary", heading_style))
    summary_data = [
        ["Metric", "Count", "Percentage"],
        ["Total Modules", str(report_data.total_modules), "100%"],
        ["Modules Tested", str(report_data.modules_tested), f"{(report_data.modules_tested/report_data.total_modules*100):.1f}%"],
        ["Modules Not Tested", str(report_data.modules_not_tested), f"{(report_data.modules_not_tested/report_data.total_modules*100):.1f}%"],
        ["Total Test Cases", str(report_data.total_test_cases), "100%"],
        ["Executed", str(report_data.executed_test_cases), f"{(report_data.executed_test_cases/report_data.total_test_cases*100):.1f}%"],
        ["Passed", str(report_data.passed), f"{report_data.pass_percentage:.1f}%"],
        ["Failed", str(report_data.failed), f"{(report_data.failed/report_data.executed_test_cases*100) if report_data.executed_test_cases > 0 else 0:.1f}%"],
        ["Pending", str(report_data.pending), ""],
        ["Skipped", str(report_data.skipped), ""],
    ]
    summary_table = Table(summary_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Module-wise Report
    elements.append(Paragraph("Module-wise Test Execution Status", heading_style))
    module_data = [["Module", "Total Tests", "Passed", "Failed", "Pending", "Skipped", "Pass %"]]
    
    for module_report in report_data.module_reports:
        module_data.append([
            module_report.module_name,
            str(module_report.total_tests),
            str(module_report.passed),
            str(module_report.failed),
            str(module_report.pending),
            str(module_report.skipped),
            f"{module_report.pass_percentage:.1f}%"
        ])
    
    module_table = Table(module_data, colWidths=[2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch])
    module_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elements.append(module_table)
    elements.append(PageBreak())
    
    # Detailed Test Case Execution
    elements.append(Paragraph("Detailed Test Case Execution", heading_style))
    
    release = db.query(Release).filter(Release.id == release_id).first()
    executions = db.query(TestExecution).filter(
        TestExecution.release_id == release_id
    ).order_by(TestExecution.test_case_id).all()
    
    if executions:
        detail_data = [["Test ID", "Test Name", "Module", "Executor", "Status", "JIRA Defects"]]
        
        for execution in executions:
            jira_defects = db.query(JiraDefect).filter(
                JiraDefect.test_execution_id == execution.id
            ).all()
            jira_ids = ", ".join([d.jira_id for d in jira_defects]) if jira_defects else "None"
            
            detail_data.append([
                execution.test_case.test_id,
                execution.test_case.title[:30] + "..." if len(execution.test_case.title) > 30 else execution.test_case.title,
                execution.test_case.module.name,
                execution.executor.full_name or execution.executor.email,
                execution.status.value.upper(),
                jira_ids
            ])
        
        detail_table = Table(detail_data, colWidths=[0.8*inch, 2*inch, 1.2*inch, 1.5*inch, 0.8*inch, 1*inch])
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
        ]))
        elements.append(detail_table)
    else:
        elements.append(Paragraph("No test executions found for this release.", styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    
    return FileResponse(filename, media_type='application/pdf', filename=os.path.basename(filename))
