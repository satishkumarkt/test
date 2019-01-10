import { Component, OnInit, OnDestroy, ViewChild, Input, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { RouterProxy } from '../../../../store/router/proxy/router.proxy';
import { NavigationService } from '../../../../shared/services/navigation/navigation.service';
import { PgConstants } from '../../../../shared/constants/pg.constants';
import { StateParams } from '../../../../shared/models/state-params/state-params.model';
import { Observable } from 'rxjs/Observable';
import { GuidanceNoteService } from '../../../../shared/services/guidance-note/guidance-note.service';
import { ContentService } from '../../../../shared/services/content/content.service';
import { EssentialsComponent } from '../../../../shared/components/essentials/essentials.component';
import { RenderContentRequest } from '../../../../shared/models/dashboard/content-request.model';
import { Base64 } from 'js-base64';
import { CompileDirective } from '../../../../shared/directives/compile.directive';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { FoldersService } from '../../../../shared/services/folders/folders.service';
import { CreateFolerViewModel } from '../../../../shared/models/Repository/Create.model';
import { DataStoreService } from '../../../../shared/services/data-store/data-store.service';

@Component({
    selector: 'guidance-note-detail',
    templateUrl: './guidance-note-detail.component.html',
    styleUrls: ['./guidance-note-detail.component.css']
})
export class GuidanceNoteDetailComponent implements OnInit {
    @ViewChild(EssentialsComponent) essentialComponent: EssentialsComponent;
    @ViewChild(CompileDirective) compile: CompileDirective;
    private subscriptions: Subscription = new Subscription();
    constructor(
        private _guidanceNoteService: GuidanceNoteService,
        private _contentService: ContentService,
        private _routerProxy: RouterProxy,
        private _navigationService: NavigationService,
        private changeDetectorRef: ChangeDetectorRef,
        private modalService: BsModalService,
        private _foldersService: FoldersService,
        private _dataStoreService: DataStoreService
    ) { }
    essentials;
    guidances;
    legislations;
    commentarys;
    caseLaws;
    subTopic;
    title;
    practiceArea;
    rootArea;
    paGuidance: string = "";
    guidanceDetail: string;
    guidanceHeader: string = "";
    showGuidanceDetail: boolean = false;
    contentOutlinesList: string[] = [];
    loadFolders: boolean = false;//added by saikiran
    saveToFolderContent;
    showGuidance: boolean = true;
    rendrContentRequest: RenderContentRequest = new RenderContentRequest();
    showGuidanceDetailChildContent: boolean = false;
    guidanceDetailChildContent: string = "";
    modalRef: BsModalRef;
    @ViewChild('modalContent') modalContent: TemplateRef<any>;
    viewModel;
    saveFolderTitle;

    ngOnInit() {
        const stateSubscription = this._routerProxy.getViewModel().subscribe((guidancedetail) => {
            if (guidancedetail) {
                this.guidances = this._dataStoreService.getSessionStorageItem("Guidances");
                this.navigateToGuidanceDetails(guidancedetail);
            }

        });

        this.subscriptions.add(stateSubscription);
    }

    showHideGuidanceReference(val) {
        this.showGuidance = val;
    }

    navigateToGuidanceDetails(guidancedetail, hasChild: string = "true") {
        this.viewModel = guidancedetail;
        this.saveFolderTitle = this.viewModel.title;
        this.rendrContentRequest.dpath = guidancedetail.domainPath;
        this.rendrContentRequest.hasChildren = hasChild;
        this.contentOutlinesList = [];
        this.guidanceHeader = this.viewModel.title;
        this._contentService.contentGuidanceDetails(this.rendrContentRequest).subscribe(data => {
            if (this.guidances) {
                this.guidances.forEach((guidance, guidanceInd) => {
                    if (guidance.domainPath == guidancedetail.domainPath) {
                        this.guidanceHeader = guidance.title;//(guidance.title.trim().indexOf(">") == 0 ? guidance.title : " > " +guidance.title);
                        guidance.subContentDomains.forEach((subHeader, subHeadInd) => {
                            this.contentOutlinesList.push((guidanceInd + 1) + "." + (subHeadInd + 1) + " " + subHeader.title);
                        });
                    }
                });
            }
            this.guidanceDetail = data;
            this.guidanceDetail = this.buildHtml(this.guidanceDetail);
            this.showGuidanceDetail = true;
        });
    }

    openLContent(domainPath: string) {
        var splitArray = domainPath.split('/');
        domainPath = splitArray[splitArray.length - 1];
        this.downloadContent(domainPath, "false");
    }


    hideGuidanceDetail() {
        this.showGuidanceDetail = false;
        this.showGuidanceDetailChildContent = false;
        this.guidanceHeader = "";
    }

    hideChildGuidanceDetail() {
        this.showGuidanceDetailChildContent = false;
    }

    getEssentials(essentialsList, eType) {
        if (this.essentials == null)
            this.essentials = [];
        essentialsList.forEach(e => {
            e.subContentDomains.forEach(el => {
                el.eType = eType;
                el.guidance = this.rootArea + ' > ' + this.practiceArea;
                this.essentials.push(el);
            });
        })

    }
    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    openMVContent(dpath: string, hasChildren: string) {
        this.downloadContent(dpath.split('#')[0], hasChildren);
    }

    downloadContent(dpath, hasChildren) {
        var rendRequest = new RenderContentRequest();
        rendRequest.dpath = dpath;
        rendRequest.hasChildren = hasChildren
        this.guidanceDetailChildContent = null;
        this.showGuidanceDetailChildContent = false;


        this._contentService.downloadContent(rendRequest).subscribe(data => {
            if (data.mimeType == "text/html") {
                this.showGuidanceDetailChildContent = true;this.guidanceDetailChildContent = this.buildHtml(this._contentService.getHtmlContent(data.fileContent));
                var title = data.fileName.replace(data.fileExtension, "");
                this.guidanceHeader = title;
                this.compile.compile = this.guidanceDetailChildContent;
                this.compile.compileContext = this;
                this.compile.compRef.changeDetectorRef.detectChanges();
                this.compile.ngOnChanges();
                
            }
            else
                this._contentService.downloadattachment(data.fileContent, data.fileName, data.mimeType);
        });


    }



    downloadEssentials(data) {
        this.rendrContentRequest.dpath = data.domainPath;
        this.rendrContentRequest.hasChildren = (data.hasChildren) ? "true" : "false";
        this._contentService.downloadContent(this.rendrContentRequest).subscribe(data => {
            this._contentService.downloadattachment(data.fileContent, data.fileName, data.mimeType);
        });
    }

    buildHtml(input: string): string {
        var regex1 = new RegExp(`onclick="javascript:window.parent.parent.addTab[(]'Loading...','PGS/ContentView.aspx[?]dpath[=]`);
        var regex2 = new RegExp(`onclick="javascript:window.parent.parent.addTab[(]'Loading...', 'Library/ContentView.aspx[?]dpath[=]`);

        input = input.replace(new RegExp('<p', 'g'), "<div");
        input = input.replace(new RegExp('</p>', 'g'), "</div><br />");
        input = input.replace(new RegExp('&#xD;&#xA;&#x9;&#x9;&#x9;&#x9;&#x9;', 'g'), "");
        input = input.replace(new RegExp('&#x9;', 'g'), "");
        input = input.replace(new RegExp(`onclick="openLContent`, 'g'), `(click)="openLContent`);
        input = input.replace(new RegExp(`onclick="openMVContent`, 'g'), `(click)="openMVContent`);
        input = input.replace(new RegExp(regex1, 'g'), `(click)="openDContent('`);
        input = input.replace(new RegExp(regex2, 'g'), `(click)="openDContent('`);
        input = input.replace(new RegExp(`href="#`, 'g'), `class="underLine`);
        input = input.replace(new RegExp('[^\u0000-\u007F]', 'g'), ' ');

        return input;
    }

    openDContent(domainPath: string) {
        if (domainPath.indexOf('#') !== -1)
            domainPath = domainPath.split('#')[0];
        this.downloadContent(domainPath, "false");
    }

    loadContentView(subContent) {
        this.navigateToGuidanceDetails(subContent.domainPath, subContent.hasChildren);
    }

    back() {
        var previousRoute = this._navigationService.getPreviousRoute();
        this._navigationService.navigate(previousRoute.previousRoute, this._navigationService.getStateParams(previousRoute.previousRoute), undefined, true);
    }

    showFolderModal(modal) {
        this.openModal(modal);
    }

    openModal(template: TemplateRef<any>) {
        var content = {
            "title": this.guidanceHeader,
            "url": (this.viewModel.subTopicDomainPath) ? this.viewModel.subTopicDomainPath : this.viewModel.domainPath,
            "searchResult": null
        };
        this.saveToFolderContent = JSON.parse(JSON.stringify(content));

        this.modalRef = this.modalService.show(template, { class: 'modal-lg' });
        this.loadFolders = true;
        //this.getFoldersAll(template);
    }

    folderInfo;
    selectedMainFolder;
    selectedSubsciberClientId;
    mainFolder;
    selFolder;
    getFoldersAll(template) {
        this.folderInfo = this._dataStoreService.getSessionStorageItem("ClientFolders");
        if (!this.folderInfo) {
            this._foldersService.getFolders().subscribe(data => {
                this.folderInfo = data;
                if (this.selectedSubsciberClientId)
                    this.selectedMainFolder = this.folderInfo.find(f => f.subscriberClientId == this.selectedSubsciberClientId);
                this.modalRef = this.modalService.show(template);
            });
        }
        else {
            this.modalRef = this.modalService.show(template);
            this.selectedMainFolder = this.folderInfo[0];
            this.selectedSubsciberClientId = this.selectedMainFolder.subscriberClientId;
            this.mainFolder = {
                "zoneId": this.selectedMainFolder.zoneId,
                "subscriberId": this.selectedMainFolder.subscriberId,
                "subscriberClientId": this.selectedMainFolder.subscriberClientId,
                "lastAccessedDate": this.selectedMainFolder.lastAccessedDate,
                "dateCreated": this.selectedMainFolder.dateCreated,
                "clientDescription": this.selectedMainFolder.clientDescription,
                "isSelected": false
            };
        }
    }

    onParentFolderSelect(subscriberClientId) {
        this.selectedSubsciberClientId = subscriberClientId;
        this.selectedMainFolder = this.folderInfo.find(f => f.subscriberClientId == subscriberClientId);
        this.mainFolder = {
            "zoneId": this.selectedMainFolder.zoneId,
            "subscriberId": this.selectedMainFolder.subscriberId,
            "subscriberClientId": this.selectedMainFolder.subscriberClientId,
            "lastAccessedDate": this.selectedMainFolder.lastAccessedDate,
            "dateCreated": this.selectedMainFolder.dateCreated,
            "clientDescription": this.selectedMainFolder.clientDescription,
            "isSelected": false
        };
    }

    selectedFolder(folder) {
        this.selFolder = folder;
    }

    SaveFile() {
        if (this.selFolder) {
            var createFolder = new CreateFolerViewModel();
            createFolder.subscriberClientId = this.selFolder.subscriberClientID;
            createFolder.folderID = this.selFolder.folderNameID;
            createFolder.url = (this.viewModel.subTopicDomainPath) ? this.viewModel.subTopicDomainPath : this.viewModel.domainPath;
            createFolder.title = (this.viewModel.practiceArea) ? this.viewModel.practiceArea : this.viewModel.title;
            this._foldersService.CreateDocument(createFolder).subscribe(data => {
                this.modalRef.hide();
            });
        }
        else
            alert("Please select a folder");
    }
    onSaveToFolderClick(folder) {
        this.selFolder = folder;
        this.SaveFile();
    }
    onPopUpCloseClick() {
        this.loadFolders = false;
        this.saveToFolderContent = null;
        this.modalRef.hide();
    }

}
